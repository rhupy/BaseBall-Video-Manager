# Baseball Video Manager V.3

Baseball Video Manager V.3은 비디오 파일과 기타 파일들을 효율적으로 관리하기 위한 Windows 데스크톱 애플리케이션입니다.

## 소개

이 프로그램은 사용자가 비디오 파일과 기타 파일들을 쉽게 관리할 수 있도록 도와줍니다. 주요 기능으로는 파일 목록 보기, 파일 실행, 평가 기능, 검색 기능, 중복 데이터 및 빈 폴더 제거 등이 있습니다. .Net Winform을 이용하여 빠르고 손쉽게 개발되었습니다.

### 주요 기능:

- **파일 목록 보기**: 관리 중인 모든 파일을 한눈에 확인
- **파일 실행**: 내장된 실행 기능으로 편리한 파일 접근
- **평가 시스템**: 파일에 대한 사용자 평가 및 점수 부여 기능
- **강력한 검색**: 원하는 파일을 빠르게 찾을 수 있는 검색 기능
- **데이터 정리**: 중복 데이터 제거 및 빈 폴더 자동 정리
- **라이브러리 관리**: 효율적인 파일 구조 유지를 위한 라이브러리 시스템

## 기술 스택

![C#](https://img.shields.io/badge/c%23-%23239120.svg?style=for-the-badge&logo=c-sharp&logoColor=white)
![.Net](https://img.shields.io/badge/.NET-5C2D91?style=for-the-badge&logo=.net&logoColor=white)
![Windows Forms](https://img.shields.io/badge/Windows%20Forms-0078D6?style=for-the-badge&logo=windows&logoColor=white)

- C# 8.0
- .NET Framework 4.7.2
- Windows Forms
- Newtonsoft.Json 13.0.1

## 설정

### data 폴더

프로그램은 `data` 폴더 내의 JSON 파일들을 사용하여 데이터를 관리합니다:

- `lib.json`: 라이브러리 경로 정보를 저장합니다.
- `media/files.json`: 비디오 파일 정보를 저장합니다.
- `file/files.json`: 기타 파일 정보를 저장합니다.

### 중요: lib.json 설정

프로그램이 정상적으로 작동하려면 `lib.json` 파일이 빌드 경로에 존재해야 합니다. 이 파일은 관리할 디렉토리 경로 정보를 포함하고 있어야 합니다.

예시 `lib.json`:
```json
[
  {
    "Idx": 1,
    "Path": "C:\\Videos"
  },
  {
    "Idx": 2,
    "Path": "D:\\Documents"
  }
]
