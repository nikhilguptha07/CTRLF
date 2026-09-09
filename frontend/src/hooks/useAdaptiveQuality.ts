import { useState, useEffect } from 'react';

export interface QualityProfile {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  dpr: [number, number];
  particleCount: number;
  shadowMapSize: number;
  enablePostProcessing: boolean;
  enableNoise: boolean;
  enableDof: boolean;
  multisampling: number;
}

export function useAdaptiveQuality(): QualityProfile {
  const [profile, setProfile] = useState<QualityProfile>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const isMobile = width < 640;
    const isTablet = width >= 640 && width < 1024;
    const isDesktop = width >= 1024;

    return {
      isMobile,
      isTablet,
      isDesktop,
      dpr: isMobile ? [1, 1.25] : [1, 1.75],
      particleCount: isMobile ? 120 : isTablet ? 220 : 350,
      shadowMapSize: isMobile ? 512 : 1024,
      enablePostProcessing: true,
      enableNoise: !isMobile,
      enableDof: isDesktop,
      multisampling: isMobile ? 0 : 4,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const isMobile = width < 640;
      const isTablet = width >= 640 && width < 1024;
      const isDesktop = width >= 1024;

      setProfile({
        isMobile,
        isTablet,
        isDesktop,
        dpr: isMobile ? [1, 1.25] : [1, 1.75],
        particleCount: isMobile ? 120 : isTablet ? 220 : 350,
        shadowMapSize: isMobile ? 512 : 1024,
        enablePostProcessing: true,
        enableNoise: !isMobile,
        enableDof: isDesktop,
        multisampling: isMobile ? 0 : 4,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return profile;
}
