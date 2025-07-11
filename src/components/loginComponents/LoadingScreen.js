import React from 'react';
const LoadingScreen = () => {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <img
          src="https://firebasestorage.googleapis.com/v0/b/vr-study-group.appspot.com/o/loading-splash.gif?alt=media&token=fb50751c-a717-46d9-9121-8dce13ac9229" // Replace with your loading GIF URL
          alt="Loading..."
          className="w-54 h-54 mb-4"
        />
        <p className="text-lg text-gray-600">Love From Team Volt ⚡</p>
      </div>
    );
  };
export default LoadingScreen;