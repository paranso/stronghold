import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

const phaseColors = {
  '투입~160°C': 'rgb(100, 170, 255)',
  '160°C~1차크랙': 'rgb(255, 140, 140)',
  '1차크랙~배출': 'rgb(100, 210, 140)',
};

const maxTotalSeconds = 10 * 60; // 10분

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const TimelineBars = React.memo(({ profiles }) => (
  <div className="w-full space-y-4 p-4">
    {profiles.map((profile) => (
      <div key={profile.fileName} className="relative h-7 mb-3">
        <div className="absolute top-1/2 -left-5 transform -translate-x-full -translate-y-1/2 text-sm text-gray-600 whitespace-nowrap">
          {profile.fileName}
        </div>
        {profile.phasesArray.map((phaseName) => {
          const phaseInfo = profile.phases[phaseName];
          if (!phaseInfo) return null;

          const startTimeInSeconds = profile.phasesArray.slice(0, profile.phasesArray.indexOf(phaseName)).reduce((acc, name) => {
            return acc + (profile.phases[name]?.durationSeconds || 0);
          }, 0);
          const startPercent = (startTimeInSeconds / maxTotalSeconds) * 100;
          const widthPercent = (phaseInfo.durationSeconds / maxTotalSeconds) * 100;
          const endTimeInSeconds = startTimeInSeconds + phaseInfo.durationSeconds;
          const endPercent = (endTimeInSeconds / maxTotalSeconds) * 100;


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
              <div className="flex items-center justify-center w-full h-full text-sm text-black whitespace-nowrap px-1">
                {`${phaseName} (${phaseInfo.percentage}%, ${phaseInfo.time}, RoR: ${phaseInfo.avgRoR})`}
              </div>
            </div>
          );
        })}
        <div className="absolute top-0 left-0 h-full border-l border-gray-200" style={{ left: '0%' }} />
        <div className="absolute top-0 left-0 h-full border-l border-gray-200" style={{ left: `${(1 * 60 / maxTotalSeconds) * 100}%` }} />
        <div className="absolute top-0 left-0 h-full border-l border-gray-200" style={{ left: `${(2 * 60 / maxTotalSeconds) * 100}%` }} />
        <div className="absolute top-0 left-0 h-full border-l border-gray-200" style={{ left: `${(3 * 60 / maxTotalSeconds) * 100}%` }} />
        <div className="absolute top-0 left-0 h-full border-l border-gray-200" style={{ left: `${(4 * 60 / maxTotalSeconds) * 100}%` }} />
        <div className="absolute top-0 left-0 h-full border-l border-gray-200" style={{ left: `${(5 * 60 / maxTotalSeconds) * 100}%` }} />
        <div className="absolute top-0 left-0 h-full border-l border-gray-200" style={{ left: `${(6 * 60 / maxTotalSeconds) * 100}%` }} />
        <div className="absolute top-0 left-0 h-full border-l border-gray-200" style={{ left: `${(7 * 60 / maxTotalSeconds) * 100}%` }} />
        <div className="absolute top-0 left-0 h-full border-l border-gray-200" style={{ left: `${(8 * 60 / maxTotalSeconds) * 100}%` }} />
        <div className="absolute top-0 left-0 h-full border-l border-gray-200" style={{ left: `${(9 * 60 / maxTotalSeconds) * 100}%` }} />
        <div className="absolute top-0 left-0 h-full border-l border-gray-200" style={{ left: `${(10 * 60 / maxTotalSeconds) * 100}%` }} />
        <div
          className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 text-xs text-gray-700"
          style={{ right: '0%' }}
        >
          {profile.totalTime}
        </div>
      </div>
    ))}

    <div className="relative h-6 border-t mt-2">
      {Array.from({ length: 11 }).map((_, i) => (
        <div
          key={i}
          className="absolute -top-3 transform -translate-x-1/2"
          style={{ left: `${(i * 60 / maxTotalSeconds) * 100}%` }}
        >
          <div className="h-2 w-px bg-gray-300" />
          <div className="text-xs text-gray-500 mt-1">{i}:00</div>
        </div>
      ))}
    </div>
  </div>
));
TimelineBars.displayName = 'TimelineBars';

const ProfileDetailCard = React.memo(({ profile }) => {
  let cumulativePercentage = 0;

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white shadow-sm relative">
      <h3 className="text-lg font-semibold mb-4">{profile.fileName || 'Unknown Profile'}</h3>

      <div className="w-full h-7 flex rounded-lg overflow-hidden mb-4 relative">
        {profile.phasesArray.map((phaseName) => {
          const phaseInfo = profile.phases[phaseName];
          if (!phaseInfo) return null;
          const widthPercentage = parseFloat(phaseInfo.percentage);
          cumulativePercentage += widthPercentage;

          return (
            <React.Fragment key={phaseName}>
              <div
                className="h-full flex items-center justify-center text-sm text-black"
                style={{
                  width: `${widthPercentage}%`,
                  backgroundColor: phaseColors[phaseName]
                }}
              >
                {`${phaseName} (${phaseInfo.percentage}%, RoR: ${phaseInfo.avgRoR})`}
              </div>
              {phaseName !== '1차크랙~배출' && (
                <div
                  className="absolute text-xs text-gray-700 transform -translate-x-1/2 translate-y-6"
                  style={{ left: `${cumulativePercentage}%` }}
                >
                  {(() => {
                    let endTimeSeconds = 0;
                    for (const name of profile.phasesArray) {
                      if (name === phaseName) break;
                      endTimeSeconds += (profile.phases[name]?.durationSeconds || 0);
                    }
                    endTimeSeconds += phaseInfo.durationSeconds;
                    return formatTime(endTimeSeconds);
                  })()}
                </div>
              )}
            </React.Fragment>
          );
        })}
        {profile.phases['1차크랙~배출'] && (
          <div
            className="absolute text-xs text-gray-700 transform -translate-x-1/2 translate-y-6"
            style={{ left: `100%` }}
          >
            {profile.totalTime}
          </div>
        )}
      </div>
    </div>
  );
});
ProfileDetailCard.displayName = 'ProfileDetailCard';

const RoastingAnalyzer = () => {
  const [profiles, setProfiles] = useState([]);
  const contentRef = useRef(null);

  const analyzeProfile = useCallback((data, fileName) => {
    let temp160Point = null;
    let firstCrackPoint = null;
    let endPoint = null;

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
    const phase1End = temp160Point ? timeToSeconds(temp160Point['시간']) : 0;
    const phase2End = firstCrackPoint ? timeToSeconds(firstCrackPoint['시간']) : 0;


    const phase1Duration = phase1End;
    const phase2Duration = phase2End - phase1End;
    const phase3Duration = totalSeconds - phase2End;

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
            <TimelineBars profiles={profiles} />
          </div>
          <div className="grid grid-cols-1 gap-6">
            {profiles.map((profile) => (
              <div key={profile.fileName} className="relative">
                <ProfileDetailCard profile={profile} />
                <button
                  onClick={() => handleRemoveProfile(profile.fileName)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 6.707a1 1 0 011.414 0L10 8.586l3.293-1.879a1 1 0 111.414 1.414L11.414 10l3.293 1.879a1 1 0 01-1.414 1.414L10 11.414l-3.293 1.879a1 1 0 01-1.414-1.414L8.586 10 5.293 11.879a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoastingAnalyzer;
