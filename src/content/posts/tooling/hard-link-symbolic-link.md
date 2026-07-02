## Introduction
> **pnpm** 을 공부하면서 계속 나오는 Hard Link, Symbolic Link 가 너무 헷갈린다.

최근 사내에서 pnpm 을 적극적으로 도입하는 과정에서 pnpm 에 대한 분석을 진행 중이었는데, Hard Link 와 Symbolic Link 가 계속 헷갈리는 내 자신을 발견하고선 이대로 안되겠다 싶어 이 참에 두 개념을 깔끔하게 정리하겠다는 생각이 들었다.

## Inode

### inode 란?

![](https://velog.velcdn.com/images/rookieand/post/19d05085-79e4-42de-95b5-2e0625cfad9b/image.png)

- Linux에서 파일과 디렉토리를 식별하고 관리하는 데 사용되는 데이터 구조입니다.
- 각 파일 및 디렉토리는 시스템 내 고유한 inode를 소유하고 있습니다.
- inode는 파일의 메타데이터를 포함합니다.
  - 여기에는 파일의 권한, 소유자, 파일 크기, 생성 시간, 수정 시간, 링크 수(참조 횟수) 등이 포함됩니다.
- `ls` 명령어의 `-i` 옵션은 inode를 보여줍니다. 가장 좌측의 숫자가 바로 inode ID입니다.

## Hard Link

### Hard Link 란?

Linux에서 파일 시스템의 파일 이름과 연결되는 Directory Entry입니다.
- 단일 파일에 대한 **추가 경로를 생성하는 메커니즘이며, 같은 inode 번호를 공유하는 엔트리를 생성합니다.**
  - 즉 하나의 파일에 여러 이름을 제공하는 효과가 있으며, 여러 위치에서 동일한 파일에 접근할 수 있습니다.
- 파일이 하나의 Hard Link에 의해 열려 내용이 변경되면, 다른 링크로 열 경우에도 변경 사항이 반영됩니다.

### Hard Link의 특징
- 디렉토리 기반의 파일 시스템에서는 각 파일의 이름을 제공하는 **하나 이상의 하드 링크가 필요합니다.**
- 하나의 파일에 대한 여러 진입점을 만들므로 링크를 추가해도 실제 디스크에 저장되는 파일 용량은 변화가 없습니다.
- 파일에 대한 모든 Hard Link가 삭제되면 inode와 관련한 데이터 블록이 디스크에서 해제되어 파일이 삭제됩니다. 
  - 따라서 하나의 파일에는 **최소 하나의 Hard Link가 필요합니다.**
- 디렉토리에 대한 Hard Link는 **일반적으로 금지되어 있습니다.**
  - 디렉토리 또한 파일로 간주되기 때문에 생성 자체는 가능하지만, 순환 참조 가능성 때문에 추천하지 않습니다.

## Symbolic Link

Linux에서 절대 경로나 상대 경로의 형태로 된 다른 파일이나 디렉터리에 대한 **참조를 포함하는 별도의 파일**입니다.
  - 원본에 대한 디렉터리 경로를 가지고 있어 해당 경로를 사용하여 원본 파일이나 디렉터리에 접근할 수 있습니다.
  - 아래 이미지는 pnpm 에서 프로젝트의 의존성 패키지들을 Symbolic Link 로 참조하는 모습입니다.
![](https://velog.velcdn.com/images/rookieand/post/e86dc9ea-5f68-4212-967c-674b24c7c874/image.png)


### Symbolic Link의 특징
- 별도의 참조 파일로 생성되기 때문에 **원본 파일과 다른 inode를 가지며**, 참조 경로의 길이에 맞는 용량을 차지합니다.
- 원본 파일이나 디렉터리가 삭제되면 **Symbolic Link는 더 이상 유효하지 않게 됩니다.**
  - 이 경우 링크 자체는 남아 있으나, 경로가 가리키는 파일이나 디렉터리가 유효하지 않아 붉은색으로 표시됩니다.
- Hard Link와 달리 간접적인 참조를 제공하므로 디렉터리에 대해서도 생성할 수 있습니다.
  - 다만 Symbolic Link 간의 순환 참조가 발생할 수 있으므로 사용에 주의해야 합니다.

## `ln` 명령어
Hard Link / Symbolic Link를 생성하는 명령어는 `ln`입니다.
- 첫 번째 인자는 원본 파일명이며, 두 번째 인자는 링크를 생성할 대상 파일이나 디렉터리가 됩니다.
- 기본적으로 Hard Link를 생성하며, `-s` 옵션을 사용하여 Hard Link 대신 Symbolic Link를 생성할 수 있습니다.
  - [IBM 공식 문서 링크](https://www.ibm.com/docs/zh/aix/7.1?topic=l-ln-command)

```bash
ln [-sfnbtv] [-S SUF] TARGET... LINK|DIR
Create a link LINK or DIR/TARGET to the specified TARGET(s)

        -s      Make symlinks instead of hardlinks
        -f      Remove existing destinations
        -n      Don't dereference symlinks - treat like normal file
        -b      Make a backup of the target (if exists) before link operation
        -S SUF  Use suffix instead of ~ when making backup files
        -T      Treat LINK as a file, not DIR
        -v      Verbose
```

### `ln` 명령어의 옵션 설명
아래는 `ln` 명령어에서 제공하는 다양한 Flag 목록입니다.

| 옵션  | 설명                                      |
|-------|-----------------------------------------|
| `-s`  | 심볼릭 링크 생성 (기본적으로는 하드 링크)       |
| `-f`  | 기존의 대상 파일을 제거                     |
| `-n`  | 심볼릭 링크를 역참조하지 않고 일반 파일처럼 취급 |
| `-b`  | 링크 작업 전에 대상 파일의 백업을 생성        |
| `-S`  | 백업 파일 생성 시 사용할 접미사를 지정         |
| `-T`  | 링크를 디렉터리가 아닌 파일로 취급              |
| `-v`  | 자세한 정보 출력                           |
