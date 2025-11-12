import { useState, useEffect } from 'react';

/**
 * モバイルデバイスかどうかを判定するカスタムフック
 * @returns {boolean} モバイルデバイスの場合true
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 初回チェック
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      
      // モバイルデバイスのユーザーエージェントパターン
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      
      // 画面幅も考慮（768px以下をモバイル扱い）
      const isMobileUA = mobileRegex.test(userAgent);
      const isMobileWidth = window.innerWidth <= 768;
      
      setIsMobile(isMobileUA || isMobileWidth);
    };

    // 初回実行
    checkIsMobile();

    // リサイズ時にも再チェック
    const handleResize = () => {
      checkIsMobile();
    };

    window.addEventListener('resize', handleResize);

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isMobile;
}

/**
 * タブレットかどうかを判定するカスタムフック
 * @returns {boolean} タブレットの場合true
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkIsTablet = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      
      // タブレットのユーザーエージェントパターン
      const tabletRegex = /iPad|Android(?!.*Mobile)/i;
      
      // 画面幅も考慮（769px-1024pxをタブレット扱い）
      const isTabletUA = tabletRegex.test(userAgent);
      const isTabletWidth = window.innerWidth > 768 && window.innerWidth <= 1024;
      
      setIsTablet(isTabletUA || isTabletWidth);
    };

    checkIsTablet();

    const handleResize = () => {
      checkIsTablet();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isTablet;
}

export default useIsMobile;
