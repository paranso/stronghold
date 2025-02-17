import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

// 도우미 함수: 시간을 초로 변환 및 mm:ss 형식으로 변환
const timeToSeconds = (timeStr) => {
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return minutes * 60 + seconds;
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const TimelineBars = ({ profiles }) => {
  // 원래 코드의 색상값
  const phaseColors = {
    0: 'rgb(121, 209, 84)', 
    1: 'rgb(255, 230, 140)', 
    2: 'rgb(184, 152, 73)'
  };

  const maxTotalSeconds = 10 * 60; // 10분

  return (
    <div className="w-full space-y-4 p-4">
      {profiles.map((profile) => (
        <div key={profile.fileName} className="mb-4">
          {/* 타임라인 영역 */}
          <div className="relative h-8">
            {profile.phases.map((phase, phaseIndex) => {
              const prevPhases = profile.phases.slice(0, phaseIndex);
              // 각 구간 시작 시간 (초)
              const startTime = prevPhases.reduce((acc, p) => {
                const [min, sec] = p.time.split(':').map(Number);
                return acc + min * 60 + sec;
              }, 0);
              
              const [min, sec] = phase.time.split(':').map(Number);
              const duration = min * 60 + sec;
              
              const startPercent = (startTime / maxTotalSeconds) * 100;
              const widthPercent = (duration / maxTotalSeconds) * 100;
              // 구간 종료 시점(누적 시간)
              const endTime = startTime + duration;
  
              return (
                <React.Fragment key={phaseIndex}>
                  <div
                    className="absolute flex items-center justify-start pl-1"
                    style={{
                      left: `${startPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: phaseColors[phaseIndex],
                      height: '100%'
                    }}
                  >
                    <span className="text-[13px] text-black font-bold whitespace-nowrap">
                      {phase.percentage}% ({phase.time}) ({phase.avgRoR})
                    </span>
                  </div>
                  {/* 각 구간의 끝 위치에 누적 시간 표시 */}
                  <div
                    className="absolute text-xs text-black"
                    style={{
                      left: `${startPercent + widthPercent}%`,
                      top: '90%',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {formatTime(endTime)}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          {/* 파일명: 초록색 막대(첫 번째 구간) 시작 위치와 동일하게 그래프 아래에 표시 */}
          <div className="mt-1 text-xs text-black pl-1">
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

  return (
    <div className="max-w-4xl mx-auto p-4" ref={contentRef}>
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
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Roasting Profiles</h2>
          </div>
          <div className="mb-6 border rounded-lg bg-white">
            <TimelineBars profiles={profiles} />
          </div>
        </div>
      )}
    </div>
  );
};

const analyzeProfile = (data, fileName) => {
  let temp160Point = null;
  let firstCrackPoint = null;
  let endPoint = null;

  // 각 포인트의 RoR 계산
  const calculateAvgRoR = (startIndex, endIndex) => {
    let totalRoR = 0;
    let count = 0;
    for (let i = startIndex + 1; i <= endIndex; i++) {
      const prevTemp = data[i - 1]['원두표면'];
      const currentTemp = data[i]['원두표면'];
      const ror = ((currentTemp - prevTemp) * 60).toFixed(1);
      totalRoR += parseFloat(ror);
      count++;
    }
    return Math.round(totalRoR / count);
  };

  // 주요 포인트 찾기
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

  const phase1End = timeToSeconds(temp160Point['시간']);
  const phase2End = timeToSeconds(firstCrackPoint['시간']);
  const totalSeconds = timeToSeconds(endPoint['시간']);

  const phase1Duration = phase1End;
  const phase2Duration = phase2End - phase1End;
  const phase3Duration = totalSeconds - phase2End;

  // 각 구간의 평균 RoR 계산
  const phase1RoR = calculateAvgRoR(0, temp160Point.index);
  const phase2RoR = calculateAvgRoR(temp160Point.index, firstCrackPoint.index);
  const phase3RoR = calculateAvgRoR(firstCrackPoint.index, endPoint.index);

  return {
    fileName,
    phases: [
      {
        name: '투입~160°C',
        time: formatTime(phase1Duration),
        percentage: (phase1Duration / totalSeconds * 100).toFixed(1),
        avgRoR: phase1RoR
      },
      {
        name: '160°C~1차크랙',
        time: formatTime(phase2Duration),
        percentage: (phase2Duration / totalSeconds * 100).toFixed(1),
        avgRoR: phase2RoR
      },
      {
        name: '1차크랙~배출',
        time: formatTime(phase3Duration),
        percentage: (phase3Duration / totalSeconds * 100).toFixed(1),
        avgRoR: phase3RoR
      }
    ],
    totalTime: formatTime(totalSeconds)
  };
};

export default RoastingAnalyzer;
