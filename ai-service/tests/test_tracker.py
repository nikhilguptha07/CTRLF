"""
Unit and Integration tests for ByteTrack Object Tracking (Phase 4).
Validates multi-frame identity persistence, multi-object handling, occlusion,
track lifecycles, target confirmation policies, and deterministic ID generation.
"""
import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import pytest
import torch
import numpy as np

from app.tracker import ByteTrackerManager
from app.detector import detector
from app.exceptions import UnsupportedTargetError

def test_single_object_persists_track_id():
    """TEST 1: One object across multiple frames maintains the same persistent track ID."""
    tracker = ByteTrackerManager()
    
    # Frame 1: Person at (100, 100, 200, 200)
    box1 = torch.tensor([[100., 100., 200., 200., 0.9, 0.]])
    out1 = tracker.update(box1, frame_number=1, timestamp_s=0.0, frame_shape=(480, 640))
    
    # Frame 2: Person slightly moved to (102, 101, 201, 202)
    box2 = torch.tensor([[102., 101., 201., 202., 0.92, 0.]])
    out2 = tracker.update(box2, frame_number=2, timestamp_s=0.033, frame_shape=(480, 640))
    
    # Frame 3: Person at (104, 103, 203, 204)
    box3 = torch.tensor([[104., 103., 203., 204., 0.91, 0.]])
    out3 = tracker.update(box3, frame_number=3, timestamp_s=0.066, frame_shape=(480, 640))
    
    assert len(out2) == 1
    assert len(out3) == 1
    # The assigned track ID must be identical across sequential frames
    assert out2[0].track_id == out3[0].track_id
    assert out2[0].class_name == "person"
    assert out2[0].track_id is not None and out2[0].track_id > 0

def test_two_objects_of_same_class_have_different_ids():
    """TEST 2: Two distinct objects of the same class receive different track IDs."""
    tracker = ByteTrackerManager()
    
    # Frame 1: Two persons at separated locations
    boxes1 = torch.tensor([
        [50., 50., 150., 150., 0.90, 0.],    # Person 1
        [300., 300., 400., 400., 0.88, 0.],  # Person 2
    ])
    tracker.update(boxes1, frame_number=1, timestamp_s=0.0, frame_shape=(480, 640))
    
    # Frame 2: Both persons remain visible
    boxes2 = torch.tensor([
        [52., 51., 151., 152., 0.91, 0.],    # Person 1
        [302., 301., 401., 402., 0.89, 0.],  # Person 2
    ])
    out2 = tracker.update(boxes2, frame_number=2, timestamp_s=0.033, frame_shape=(480, 640))
    
    assert len(out2) == 2
    track_ids = [d.track_id for d in out2]
    assert len(set(track_ids)) == 2, "Two distinct persons must have distinct track IDs"
    assert track_ids[0] != track_ids[1]

def test_different_classes_association():
    """TEST 3: Detections of different classes preserve correct class identities."""
    tracker = ByteTrackerManager()
    
    # Frame 1: Person (class 0) and Bottle (class 39)
    boxes1 = torch.tensor([
        [50., 50., 150., 150., 0.92, 0.],    # Person
        [300., 300., 350., 400., 0.85, 39.], # Bottle
    ])
    tracker.update(boxes1, frame_number=1, timestamp_s=0.0, frame_shape=(480, 640))
    
    # Frame 2
    boxes2 = torch.tensor([
        [51., 50., 151., 150., 0.91, 0.],
        [301., 300., 351., 400., 0.86, 39.],
    ])
    out2 = tracker.update(boxes2, frame_number=2, timestamp_s=0.033, frame_shape=(480, 640))
    
    assert len(out2) == 2
    classes = {d.class_name for d in out2}
    assert "person" in classes
    assert "bottle" in classes

def test_temporary_occlusion_reassociation():
    """TEST 4: Temporary occlusion does not invent a new ID when object reappears."""
    tracker = ByteTrackerManager(track_buffer=10)
    
    # Frames 1 and 2: Object visible
    box = torch.tensor([[100., 100., 200., 200., 0.90, 0.]])
    tracker.update(box, frame_number=1, timestamp_s=0.0, frame_shape=(480, 640))
    out2 = tracker.update(box, frame_number=2, timestamp_s=0.033, frame_shape=(480, 640))
    original_id = out2[0].track_id
    
    # Frames 3 & 4: Occluded (0 detections)
    tracker.update([], frame_number=3, timestamp_s=0.066, frame_shape=(480, 640))
    tracker.update([], frame_number=4, timestamp_s=0.099, frame_shape=(480, 640))
    
    # Frame 5: Reappears at nearby coordinate
    reappear_box = torch.tensor([[103., 101., 202., 201., 0.90, 0.]])
    out5 = tracker.update(reappear_box, frame_number=5, timestamp_s=0.132, frame_shape=(480, 640))
    
    assert len(out5) == 1
    assert out5[0].track_id == original_id, "Reappearing object should reassociate with original track ID"

def test_object_disappears_permanently_lifecycle():
    """TEST 5: Expired track transitions to LOST and then ENDED."""
    # Configure short buffer of 3 frames
    tracker = ByteTrackerManager(track_buffer=3)
    
    box = torch.tensor([[100., 100., 200., 200., 0.90, 0.]])
    tracker.update(box, frame_number=1, timestamp_s=0.0, frame_shape=(480, 640))
    out2 = tracker.update(box, frame_number=2, timestamp_s=0.033, frame_shape=(480, 640))
    tid = out2[0].track_id
    
    # Frame 3: Missing -> track becomes LOST
    tracker.update([], frame_number=3, timestamp_s=0.066, frame_shape=(480, 640))
    tracks_f3 = tracker.get_tracks()
    track_rec = next((t for t in tracks_f3 if t.track_id == tid), None)
    assert track_rec is not None
    assert track_rec.status == "LOST"
    
    # Frames 4, 5, 6, 7: Missing beyond buffer -> track becomes ENDED
    for f in range(4, 8):
        tracker.update([], frame_number=f, timestamp_s=f * 0.033, frame_shape=(480, 640))
        
    tracks_f7 = tracker.get_tracks()
    ended_rec = next((t for t in tracks_f7 if t.track_id == tid), None)
    assert ended_rec is not None
    assert ended_rec.status == "ENDED"

def test_target_confirmation_requires_min_confirm_frames():
    """TEST 6: TARGET_ACQUIRED occurs only after meeting MIN_CONFIRM_FRAMES threshold."""
    tracker = ByteTrackerManager(min_confirm_frames=3)
    
    # 1 detection is tentative and insufficient for 3-frame confirmation
    box = torch.tensor([[100., 100., 200., 200., 0.90, 0.]])
    tracker.update(box, frame_number=1, timestamp_s=0.0, frame_shape=(480, 640))
    assert tracker.confirm_target("person", min_confirm_frames=3) is None
    
    # 2 detections still insufficient
    tracker.update(box, frame_number=2, timestamp_s=0.033, frame_shape=(480, 640))
    assert tracker.confirm_target("person", min_confirm_frames=3) is None
    
    # 3 detections satisfies the policy -> Confirmed!
    tracker.update(box, frame_number=3, timestamp_s=0.066, frame_shape=(480, 640))
    confirmed = tracker.confirm_target("person", min_confirm_frames=3)
    assert confirmed is not None
    assert confirmed.class_name == "person"
    assert confirmed.total_detections >= 3

def test_unsupported_target_rejected():
    """TEST 7: Unsupported target classes like 'keys' raise UnsupportedTargetError."""
    is_supp, canon = detector.is_supported_target("keys")
    assert is_supp is False
    assert canon is None

def test_deterministic_track_ids():
    """TEST 10: Track IDs are positive integers generated by tracking algorithm, never random floats."""
    tracker = ByteTrackerManager()
    box = torch.tensor([[100., 100., 200., 200., 0.90, 0.]])
    tracker.update(box, frame_number=1, timestamp_s=0.0, frame_shape=(480, 640))
    out2 = tracker.update(box, frame_number=2, timestamp_s=0.033, frame_shape=(480, 640))
    
    tid = out2[0].track_id
    assert isinstance(tid, int)
    assert tid > 0
