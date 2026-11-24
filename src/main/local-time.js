// 시스템(현지) 시간 기준 타임스탬프: "YYYY-MM-DD HH:mm:ss"
function localTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

// 파일명에 쓸 수 있는 형태: "YYYY-MM-DDTHH-mm-ss"
function localFileStamp(date = new Date()) {
  return localTimestamp(date).replace(" ", "T").replace(/:/g, "-");
}

module.exports = { localTimestamp, localFileStamp };
