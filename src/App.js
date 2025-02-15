import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Download, X } from 'lucide-react';

const phaseColors = {
  '투입~160°C': '#90EE90',
  '160°C~1차크랙': '#FFFFE0',
  '1차크랙~배출': '#D2B48C',
};

const maxTotalSeconds = 10 * 60;

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const TimelineBars = React.memo(({ profiles, handleRemoveProfile }) => (
  <div className="w-full space-y-4 p-4">
    {profiles.map((profile) => {
      let cumSeconds = 0;
      const markers = [];
      if (profile.phases['투입~160°C']) {
        cumSeconds += profile.phases['투입~160°C'].durationSeconds;
        markers.push({ label: formatTime(cumSeconds), left: (cumSeconds / maxTotalSeconds) * 100 });
      }
      if (profile.phases['160°C~1차크랙']) {
        cumSeconds += profile.phases['160°C~1차크랙'].durationSeconds;
        markers.push({ label: formatTime(cumSeconds), left: (cumSeconds / maxTotalSeconds) * 100 });
      }
      if (profile.phases['1차크랙~배출']) {
        cumSeconds += profile.phases['1차크랙~배출'].durationSeconds;
        markers.push({ label: profile.totalTime, left: (cumSeconds / maxTotalSeconds) * 100 });
      }

      return (
        <div key={profile.fileName} className="relative h-11 mb-7">
          <div className="absolute top-1/2 -left-5 transform -translate-x-full -translate-y-1/2 text-sm text-black whitespace-nowrap">
            {profile.fileName}
          </div>
          {profile.phasesArray.map((phaseName) => {
            const phaseInfo = profile.phases[phaseName];
            if (!phaseInfo) return null;
            const startTimeInSeconds = profile.phasesArray
              .slice(0, profile.phasesArray.indexOf(phaseName))
              .reduce((acc, name) => acc + (profile.phases[name]?.durationSeconds || 0), 0);
            const startPercent = (startTimeInSeconds / maxTotalSeconds) * 100;
            const widthPercent = (phaseInfo.durationSeconds / maxTotalSeconds) * 100;
            return (
              <div
                key={phaseName}
                className="absolute h-full flex items-center"
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                  backgroundColor: phaseColors[phaseName],
                }}
              >
              </div>
            );
          })}
          <div className="absolute top-full left-0 w-full flex justify-start items-start text-xs text-black mt-1">
            {profile.phasesArray.map(phaseName => {
              const phaseInfo = profile.phases[phaseName];
              if (!phaseInfo) return null;
              const startTimeInSeconds = profile.phasesArray
                .slice(0, profile.phasesArray.indexOf(phaseName))
                .reduce((acc, name) => acc + (profile.phases[name]?.durationSeconds || 0), 0);
              const startPercent = (startTimeInSeconds / maxTotalSeconds) * 100;
              return (
                <div
                  key={phaseName}
                  className="absolute"
                  style={{ left: `${startPercent}%`, textAlign: 'left', transform: 'translateY(0.5em)' }}
                >
                  {`${phaseInfo.time} ${phaseInfo.percentage}% ${phaseInfo.avgRoR}`}
                </div>
              );
            })}
          </div>
          <button
            onClick={() => handleRemoveProfile(profile.fileName)}
            className="absolute top-1/2 right-0 transform -translate-y-1/2 text-gray-500 hover:text-red-500"
            aria-label="Remove Profile"
          >
            <X size={16} />
          </button>
          <div className="relative mt-3 h-4">
            {markers.map((marker, index) => (
              <div
                key={index}
                className="absolute text-xs text-black -translate-x-1/2 top-0"
                style={{ left: `${marker.left}%` }}
              >
                {marker.label}
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
));
TimelineBars.displayName = 'TimelineBars';

const ProfileDetailCard = React.memo(({ profile }) => {
  return null;
});
ProfileDetailCard.displayName = 'ProfileDetailCard';

const RoastingAnalyzer = () => {
  const [profiles, setProfiles] = useState([]);
  const contentRef = useRef(null);

  const analyzeProfile = useCallback((data, fileName) => {
    let temp160Point = null;
    let firstCrackPoint = null;
    let endPoint = null;
    let phase1End = null; // phase1End 변수 초기화 (null)

    const timeToSeconds = (timeStr) => {
      const [minutes, seconds] = timeStr.split(':').map(Number);
      return minutes * 60 + seconds;
    };

    const calculateAvgRoR = (startIndex, endIndex) => {
      if (startIndex >= endIndex) return 0;
      let totalRoR = 0;
      let count = 0;
      for (let i = startIndex + 1; i <= endIndex; i++) {
        const prevTemp = data[i - 1]['원두표면'];
        const currentTemp = data[i]['원두표면'];
        if (prevTemp !== undefined && currentTemp !== undefined) {
          const ror = ((currentTemp - prevTemp) * 60).toFixed(1);
          totalRoR += parseFloat(ror);
          count++;
        }
      }
      return count > 0 ? Math.round(totalRoR / count) : 0;
    };

    data.forEach((row, index) => {
      const beanTemp = row['원두표면'];
      if (!temp160Point && beanTemp >= 160) {
        temp160Point = { ...row, index };
      }
      if (!firstCrackPoint && beanTemp >= 204) {
        firstCrackPoint = { ...row, index };
      }
      if (index === data.length - 1) {
        endPoint = { ...row, index };
      }
    });

    const totalSeconds = endPoint ? timeToSeconds(endPoint['시간']) : 0;
    const phase1Duration = phase1End ? timeToSeconds(temp160Point['시간']) - 0 : 0; // 명시적으로 계산 (이제 phase1End는 null 또는 값을 가짐)
    const phase2Duration = firstCrackPoint ? timeToSeconds(firstCrackPoint['시간']) - phase1Duration : 0; // 명시적으로 계산
    const phase3Duration = endPoint && firstCrackPoint ? totalSeconds - phase2Duration - phase1Duration : 0; // 명시적으로 계산


    const phases = {
      '투입~160°C': temp160Point ? {
        time: formatTime(phase1Duration),
        durationSeconds: phase1Duration,
        percentage: totalSeconds > 0 ? (phase1Duration / totalSeconds * 100).toFixed(1) : '0',
        avgRoR: calculateAvgRoR(0, temp160Point.index)
      } : null,
      '160°C~1차크랙': firstCrackPoint ? {
        time: formatTime(phase2Duration),
        durationSeconds: phase2Duration,
        percentage: totalSeconds > 0 ? (phase2Duration / totalSeconds * 100).toFixed(1) : '0',
        avgRoR: calculateAvgRoR(temp160Point?.index || 0, firstCrackPoint.index)
      } : null,
      '1차크랙~배출': endPoint && firstCrackPoint ? {
        time: formatTime(phase3Duration),
        durationSeconds: phase3Duration,
        percentage: totalSeconds > 0 ? (phase3Duration / totalSeconds * 100).toFixed(1) : '0',
        avgRoR: calculateAvgRoR(firstCrackPoint.index, endPoint.index)
      } : null,
    };

    return {
      fileName,
      phases,
      phasesArray: Object.keys(phases),
      totalTime: formatTime(totalSeconds)
    };
  }, []);

  const handleFileUpload = useCallback(async (event) => {
    const files = Array.from(event.target.files);

    const newProfiles = await Promise.all(files.map(async (file) => {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        cellStyles: true,
        cellFormulas: true,
        cellDates: true,
        cellNF: true,
        sheetStubs: true
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const header = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const requiredHeaders = ['시간', '원두표면'];
      const normalizedHeaders = header.map(h => h.trim());
      const hasRequiredHeaders = requiredHeaders.every(requiredHeader =>
        normalizedHeaders.some(header => header.toLowerCase() === requiredHeader.toLowerCase())
      );

      if (!hasRequiredHeaders) {
        alert(`Required columns ("시간", "원두표면") are missing or named incorrectly in file: ${file.name}. Please check your Excel file.`);
        return null;
      }

      const profile = analyzeProfile(jsonData, file.name);
      return profile;
    }));

    setProfiles(prevProfiles => [...prevProfiles, ...newProfiles.filter(profile => profile)]);
  }, [analyzeProfile]);

  const handleSaveAsImage = useCallback(() => {
    if (!contentRef.current) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const element = contentRef.current;

    const scale = 2;
    canvas.width = element.offsetWidth * scale;
    canvas.height = element.offsetHeight * scale;
    context.scale(scale, scale);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${element.offsetWidth}" height="${element.offsetHeight}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            ${element.innerHTML}
          </div>
        </foreignObject>
      </svg>
    `;

    const img = new Image();
    img.onload = () => {
      context.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const link = document.createElement('a');
      link.download = `roasting-profile-${timestamp}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobUrl = URL.createObjectURL(svgBlob);
    img.src = blobUrl;
  }, [contentRef]);

  const handleRemoveProfile = useCallback((fileNameToRemove) => {
    setProfiles(prevProfiles => prevProfiles.filter(profile => profile.fileName !== fileNameToRemove));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6" ref={contentRef}>
      <div className="mb-8">
        <label htmlFor="file-upload" className="block mb-2 text-sm font-medium text-gray-900">
          Upload Roasting Profiles (Excel files)
        </label>
        <input
          id="file-upload"
          type="file"
          multiple
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {profiles.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-semibold">Roasting Profiles</h2>
            <button
              onClick={handleSaveAsImage}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Download size={20} />
              Save as Image
            </button>
          </div>
          <div className="mb-8 border rounded-lg bg-white shadow-md">
            <TimelineBars profiles={profiles} handleRemoveProfile={handleRemoveProfile} />
          </div>
        </div>
      )}
    </div>
  );
};

export default RoastingAnalyzer;
