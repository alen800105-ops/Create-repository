import React from 'react';
const LoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-pulse"></div>
        <div className="absolute inset-0 flex items-center justify-center">
             <i className="fa-solid fa-plane text-4xl text-blue-500 animate-bounce"></i>
        </div>
        <div className="absolute top-0 left-0 w-full h-full border-t-4 border-blue-500 rounded-full animate-spin"></div>
      </div>
      <h3 className="text-xl font-bold text-gray-700">正在搜尋航班中...</h3>
      <p className="text-gray-500 mt-2">AI 正在即時比價，請稍候 5-10 秒。</p>
    </div>
  );
};
export default LoadingState;
