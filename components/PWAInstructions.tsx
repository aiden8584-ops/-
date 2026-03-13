
import React from 'react';
import { Share, PlusSquare, ExternalLink, Smartphone } from 'lucide-react';

interface PWAInstructionsProps {
  onClose: () => void;
  deferredPrompt?: any;
  onInstallSuccess?: () => void;
}

const PWAInstructions: React.FC<PWAInstructionsProps> = ({ onClose, deferredPrompt, onInstallSuccess }) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isInApp = /KAKAOTALK|Line|NAVER|FBAN|FBAV/.test(navigator.userAgent.toUpperCase());

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      onInstallSuccess?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-pop overflow-hidden relative">
        <div className="absolute top-0 right-0 p-6">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-2xl font-black text-gray-900">홈 화면에 추가하기</h3>
          <p className="text-gray-500 text-sm mt-2">앱처럼 편리하게 시험을 치를 수 있습니다.</p>
        </div>

        {isInApp && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
            <div className="flex gap-3">
              <ExternalLink className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-900">외부 브라우저로 열기 권장</p>
                <p className="text-xs text-amber-700 mt-1">
                  현재 카카오톡/네이버 등 인앱 브라우저입니다. 우측 상단 메뉴를 눌러 <b>'기본 브라우저로 열기'</b>(Safari 또는 Chrome)를 먼저 해주세요.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {deferredPrompt ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center">
              <p className="text-sm text-indigo-900 font-bold mb-4">
                이 기기는 자동 설치를 지원합니다!
              </p>
              <button 
                onClick={handleInstallClick}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
              >
                지금 바로 앱 설치하기
              </button>
              <p className="text-[10px] text-indigo-400 mt-3">
                버튼을 누른 후 나타나는 팝업에서 '설치'를 눌러주세요.
              </p>
            </div>
          ) : isIOS ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <p className="text-sm text-gray-700 pt-1">하단 바의 <b>공유 버튼</b>(<Share className="inline w-4 h-4" />)을 누릅니다.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <p className="text-sm text-gray-700 pt-1">리스트를 내려 <b>'홈 화면에 추가'</b>(<PlusSquare className="inline w-4 h-4" />)를 선택합니다.</p>
              </div>
            </div>
          ) : isAndroid ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <p className="text-sm text-gray-700 pt-1">우측 상단 <b>메뉴 버튼</b>(점 3개)을 누릅니다.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <p className="text-sm text-gray-700 pt-1"><b>'홈 화면에 추가'</b> 또는 <b>'앱 설치'</b>를 선택합니다.</p>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 text-sm">브라우저 설정을 통해 홈 화면에 추가할 수 있습니다.</p>
          )}
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-colors"
        >
          확인했습니다
        </button>
      </div>
    </div>
  );
};

export default PWAInstructions;
