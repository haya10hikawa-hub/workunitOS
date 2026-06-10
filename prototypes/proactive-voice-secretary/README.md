# WorkUnit OS 先回り音声秘書プロトタイプ

## 目的

チャットUIを使わず、モックイベントを裏でROI判定し、閾値超過時だけAI側から音声で割り込む。

## 実行

```bash
node --experimental-strip-types prototypes/proactive-voice-secretary/voiceLoop.mts
```

## 閾値変更

```bash
ROI_THRESHOLD=80 node --experimental-strip-types prototypes/proactive-voice-secretary/voiceLoop.mts
```

## 範囲

- 入力: `mockEvents.mts`
- 判定: `ROI = (Impact * Urgency * ActorWeight) / Effort`
- 発話: macOS `say`
- 失敗時: `[voice-fallback]` として標準出力へ退避
- Yes時: `workunit_push` のIssue Draft相当タスクを出力
