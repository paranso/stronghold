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
            {phase.percentage}% (ROR: {phase.avgRoR})
          </div>
        ))}
      </div>

      <div className="text-sm flex mb-2">
        <span className="w-32">160°C</span>
        <span>{profile.temp160Time}</span>
      </div>
      <div className="text-sm flex mb-2">
        <span className="w-32">1차 크랙(204°C)</span>
        <span>{profile.firstCrackTime}</span>
      </div>
      <div className="text-sm flex">
        <span className="w-32">Total Time:</span>
        <span className="font-medium">{profile.totalTime}</span>
      </div>
    </div>
  </div>
);

// analyzeProfile 함수 수정
const analyzeProfile = (data, fileName) => {
  let temp160Point = null;
  let firstCrackPoint = null;
  let endPoint = null;

  // Calculate RoR for each point
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

  // Find key points
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

  // Calculate average RoR for each phase
  const phase1RoR = calculateAvgRoR(0, temp160Point.index);
  const phase2RoR = calculateAvgRoR(temp160Point.index, firstCrackPoint.index);
  const phase3RoR = calculateAvgRoR(firstCrackPoint.index, endPoint.index);

  return {
    fileName,
    temp160Time: `160°C / ${temp160Point['시간']}`,
    firstCrackTime: `204°C / ${firstCrackPoint['시간']}`,
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
