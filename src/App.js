import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

const TimelineBars = ({ profiles }) => {
  const phaseColors = {
    0: 'rgb(100, 170, 255)', // 중간 톤 파란색
    1: 'rgb(255, 140, 140)', // 중간 톤 빨간색
    2: 'rgb(100, 210, 140)'  // 중간 톤 초록색
  };

  const maxTotalSeconds = 10 * 60; // 10분

  return (
    <div className="w-full space-y-2 p-4">
      {profiles.map((profile, profileIndex) => (
        <div key={profile.fileName} className="relative h-6 mb-2">
          {profile.phases.map((phase, phaseIndex) => {
            const prevPhases = profile.phases.slice(0, phaseIndex);
            const startTime = prevPhases.reduce((acc, p) => {
              const [min, sec] = p.time.split(':').map(Number);
              return acc + min * 60 + sec;
            }, 0);
            
            const [min, sec] = phase.time.split(':').map(Number);
            const duration = min * 60 + sec;
            
            const startPercent = (startTime / maxTotalSeconds) * 100;
            const widthPercent = (duration / maxTotalSeconds) * 100;

            return (
              <div
                key={phaseIndex}
                className="absolute h-full flex items-center"
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                  backgroundColor: phaseColors[phaseIndex],
                }}
              >
                <div className="px-2 text-xs text-white whitespace-nowrap">
                  {phase.time} ({phase.percentage}%)
                </div>
              </div>
            );
          })}
          <div className="absolute top-1/2 -left-4 transform -translate-x-full -translate-y-1/2 text-sm text-gray-600 whitespace-nowrap">
            {profile.fileName}
          </div>
        </div>
      ))}
      
      <div className="relative h-6 border-t">
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
  );
};

const ProfileDetailCard = ({ profile }) => (
  <div className="border rounded-lg p-4 mb-4 bg-white">
    <h3 className="text-lg font-semibold mb-4">{profile.fileName || 'Unknown Profile'}</h3>
    
    <div className="space-y-2">
      <div className="w-full h-6 flex rounded-lg overflow-hidden mb-4">
        {profile.phases.map((phase, index) => (
          <div
            key={index}
            className="h-full flex items-center justify-center text-white text-xs"
            style={{
              width: `${phase.percentage}%`,
              backgroundColor: index === 0 ? 'rgb(100, 170, 255)' : index === 1 ? 'rgb(255, 140, 140)' : 'rgb(100, 210, 140)'
            }}
          >
            {phase.percentage}%
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="text-sm flex">
          <span className="w-48">Total Time:</span>
          <span className="font-medium">{profile.totalTime}</span>
        </div>
        <div className="text-sm flex">
          <span className="w-48">Temperature Range:</span>
          <span>{profile.tempRange}</span>
        </div>
      </div>
    </div>
  </div>
);

const RoastingAnalyzer = () => {
  const [profiles, setProfiles] = useState([]);
  const contentRef = useRef(null);

  const handleFileUpload = async (event) => {
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
      
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      const profile = analyzeProfile(data, file.name);
      return profile;
    }));

    setProfiles([...profiles, ...newProfiles]);
  };

  const handleSaveAsImage = () => {
    if (!contentRef.current) return;

    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const element = contentRef.current;

    // Set canvas dimensions
    canvas.width = element.offsetWidth * 2;
    canvas.height = element.offsetHeight * 2;
    context.scale(2, 2);

    // Draw white background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Convert to data URL and trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'roasting-profile.png';
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium text-gray-900">
          Upload Roasting Profiles (Excel files)
        </label>
        <input
          type="file"
          multiple
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {profiles.length > 0 && (
        <div ref={contentRef}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Roasting Profiles</h2>
            <button
              onClick={handleSaveAsImage}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Download size={20} />
              Save as Image
            </button>
          </div>
          <div className="mb-6 border rounded-lg bg-white">
            <TimelineBars profiles={profiles} />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {profiles.map((profile, index) => (
              <ProfileDetailCard key={index} profile={profile} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const timeToSeconds = (timeStr) => {
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return minutes * 60 + seconds;
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const analyzeProfile = (data, fileName) => {
  let temp160Point = null;
  let firstCrackPoint = null;
  let endPoint = null;

  data.forEach((row, index) => {
    const beanTemp = row['원두표면'];
    if (!temp160Point && beanTemp >= 160) {
      temp160Point = row;
    }
    if (!firstCrackPoint && beanTemp >= 204) {
      firstCrackPoint = row;
    }
    if (index === data.length - 1) {
      endPoint = row;
    }
  });

  const phase1End = timeToSeconds(temp160Point['시간']);
  const phase2End = timeToSeconds(firstCrackPoint['시간']);
  const totalSeconds = timeToSeconds(endPoint['시간']);

  const phase1Duration = phase1End;
  const phase2Duration = phase2End - phase1End;
  const phase3Duration = totalSeconds - phase2End;

  return {
    fileName,
    phases: [
      {
        name: '투입~160°C',
        time: formatTime(phase1Duration),
        percentage: (phase1Duration / totalSeconds * 100).toFixed(1)
      },
      {
        name: '160°C~1차크랙',
        time: formatTime(phase2Duration),
        percentage: (phase2Duration / totalSeconds * 100).toFixed(1)
      },
      {
        name: '1차크랙~배출',
        time: formatTime(phase3Duration),
        percentage: (phase3Duration / totalSeconds * 100).toFixed(1)
      }
    ],
    totalTime: formatTime(totalSeconds),
    tempRange: `${data[0]['원두표면']}°C → ${endPoint['원두표면']}°C`
  };
};

const App = () => {
  return <RoastingAnalyzer />;
};

export default App;
