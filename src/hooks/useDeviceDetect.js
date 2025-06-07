import { useState, useEffect } from "react";

const useDeviceDetect = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      // Check screen width
      const screenWidth = window.innerWidth;

      // Check user agent for mobile devices
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ["mobile", "android", "iphone", "ipad", "tablet"];
      const isMobileUA = mobileKeywords.some((keyword) =>
        userAgent.includes(keyword)
      );

      // Consider mobile if screen width is less than 768px OR user agent indicates mobile
      const isMobileDevice = screenWidth < 768 || isMobileUA;

      setIsMobile(isMobileDevice);
    };

    // Check on mount
    checkDevice();

    // Add event listener for window resize
    window.addEventListener("resize", checkDevice);

    // Cleanup
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return { isMobile };
};

export default useDeviceDetect;
