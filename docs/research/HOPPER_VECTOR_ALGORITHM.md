# Hopper 動作ベクトル統合アルゴリズム v1

## 1. 目的

この文書は、Hopper の入力選別と学習のためのベクトル処理仕様を定義する。

目的は2つある。

- PC 上に表示する候補を厳しく絞り、判断負荷を下げる
- `open / defer / archive` の行動を学習し、将来の選別精度を上げる

この仕様は `WorkUnit OS` 本体の概要説明ではなく、Hopper の知能コアに関する実装仕様である。

## 2. 設計方針

Google Search の発想をそのまま複製するのではなく、役割を Hopper 向けに置き換えて採用する。

- `BERT` 相当: 入力内容の文脈理解
- `RankBrain` 相当: 行動ログによる順位補正
- `MUM` 相当: 複数ソース・複数形式の統合

その上で、Hopper では単一の平均ベクトルだけでユーザー状態を表現しない。

理由:

- 複数の関心やプロジェクトが混ざると文脈が鈍る
- `accept` と `reject` を同一空間で単純平均すると意味が崩れる
- 短期の集中対象と長期の専門性は別メモリで扱う必要がある
- URL、ポスト、リポジトリ、画像OCRを同一入力として処理するには統合層が必要

そのため、Hopper は `Understand -> Merge -> Rank` の3段階と、分離メモリ構造を採用する。

## 3. 処理パイプライン

### 3.1 Understand 層

役割:

- 入力内容の意味理解
- 要約生成
- タグ生成
- 現在の作業文脈との関連度推定

入力例:

- 記事本文
- X 投稿
- GitHub README
- スクリーンショット由来OCR
- RSS の要約本文

出力:

- `v_input`
- 3行要約
- tags
- source metadata
- semantic topic labels

### 3.2 Merge 層

役割:

- 同一テーマ・近接候補の統合
- 重複排除
- マルチモーダル入力の集約

具体例:

- 同じテーマの X 投稿とブログ記事を1つの候補群に束ねる
- GitHub Star とその README 要約を1候補にまとめる
- スクリーンショットOCRと元記事URLを同一候補として寄せる

出力:

- cluster id
- canonical item
- duplicate links
- multimodal confidence

### 3.3 Rank 層

役割:

- 候補の表示順位決定
- 行動ログに基づく重み補正
- 表示件数の抑制

入力:

- `V_short`
- `V_work`
- `V_long`
- `M_reject`
- judgment logs

出力:

- rank score
- display / archive decision

## 4. ベクトル構造

### 4.1 入力ベクトル

`v_input`

対象:

- Share Sheet から送られた URL
- Browser Extension から保存されたページ
- X ブックマーク
- GitHub Star
- RSS / Newsletter
- Screenshot 由来の OCR テキストやメタデータ

構成要素:

- title
- body or extracted text
- source
- author or actor
- tags
- repo metadata
- image OCR text

### 4.2 作業文脈ベクトル

`v_work`

対象:

- 直近で編集しているファイル群の要約
- 開いている issue / task / notes
- 直近 commit message
- 手元プロジェクトの要約

注意:

生コード全文をそのまま使わない。  
コードは要約・記号抽出・トピック化した上でベクトル化する。

### 4.3 行動ベクトル

`v_accept`

- `keep` された入力

`v_reject`

- `discard` された入力

`v_open`

- `open` されたが即 keep されなかった入力

### 4.4 行動メタシグナル

ベクトルとは別に、以下の数値シグナルを保持する。

- `decision_ms`: 最終判断までの時間
- `dwell_ms`: 詳細表示に留まった時間
- `revisit_count`: 後日再訪回数
- `downstream_action`: task / issue / commit につながったか
- `source_type`: X / GitHub / RSS など
- `project_scope`: どのプロジェクト文脈か

## 5. 状態メモリ

Hopper は単一の `V_context` ではなく、以下の状態を持つ。

### 5.1 短期文脈

`V_short`

- 直近 24-72 時間の `keep` と `open` を中心に構成
- 今の集中対象を表す

### 5.2 作業文脈

`V_work`

- 現在のコード、issue、メモ、プロジェクト要約から構成
- 今まさに手を動かしている対象を表す

### 5.3 長期文脈

`V_long`

- 過去数週間から数カ月の保持傾向から構成
- ユーザーの専門性や恒常的関心を表す

### 5.4 reject メモリ

`M_reject`

- `discard` された情報のクラスタ
- 単純な負ベクトルではなく、落とす傾向の履歴として扱う

### 5.5 open-only メモリ

`M_open`

- 興味は示したが保持までは至らなかった情報
- 曖昧な関心として後続学習に使う

## 6. 時間減衰

初期版では、忘却曲線の複雑なモデルは使わず、指数減衰を採用する。

`weight_time(i) = exp(-lambda * age_i)`

ここで:

- `age_i`: 経過時間
- `lambda`: 減衰係数

最初は固定値で運用し、後でログから調整する。

## 7. 行動重み

各入力の重みは、行動の種類によって変える。

例:

- `keep`: 高
- `open`: 中
- `discard`: 中
- スマホからの未判断入力: 低

初期の重み例:

- `w_keep = 1.0`
- `w_open = 0.45`
- `w_discard = 0.60`
- `w_unread = 0.15`

注意:

`discard` は「負の好み」と決め打ちしない。  
reject メモリに別管理し、ランキング時の減点要素として使う。

## 8. 状態更新

### 8.1 短期文脈の更新

`V_short` は、直近行動を時間減衰付きで加重平均して更新する。

擬似式:

`V_short <- normalize(sum(w_i * v_i * weight_time(i)))`

対象:

- keep
- open
- 再訪

### 8.2 長期文脈の更新

`V_long` は、短期文脈よりも遅い速度で更新する。

対象:

- keep のみを主に反映
- 実行転換した入力を強く反映

### 8.3 reject メモリの更新

`M_reject` は discard 入力の集合を蓄積する。

扱い:

- 平均1本に潰してもよいが、将来的にはクラスタ管理が望ましい
- 理由の異なる reject を混ぜすぎない

## 9. マルチソース統合

Merge 層では、複数ソースから来た近接候補を統合する。

統合の対象例:

- 同一URL
- 同一repo
- 高類似の記事と投稿
- OCRテキストと原典URL

初期統合ルール:

- URL 一致は同一候補
- repo 一致は同一候補
- embedding 類似度が閾値超えなら候補クラスタへ統合
- 時間差が小さい関連入力は同一候補として扱う

統合後の canonical item に対してランキングを行う。

## 10. スコアリング

入力候補 `x` の最終スコアは、単一 cosine ではなく複合スコアで計算する。

初期式:

`score(x) = 0.35 * sim(x, V_work) + 0.25 * sim(x, V_short) + 0.15 * sim(x, V_long) + 0.10 * multimodal_confidence(x) + 0.10 * behavior_prior(x) - 0.10 * sim(x, M_reject) - 0.05 * duplicate_penalty(x)`

項目:

- `sim(x, V_work)`: 現在の作業との近さ
- `sim(x, V_short)`: 直近の関心との近さ
- `sim(x, V_long)`: 長期嗜好との近さ
- `multimodal_confidence(x)`: 複数ソース・複数形式で裏取りされている強さ
- `behavior_prior(x)`: 過去の keep / revisit / downstream_action に基づく行動事前分布
- `sim(x, M_reject)`: 過去に落とした傾向との近さ
- `duplicate_penalty(x)`: 既知候補との重複による減点

この段階が Hopper における `RankBrain` 相当の役割を持つ。

## 11. 表示ロジック

「常に5件出す」仕様にはしない。  
表示件数は `最大5件` にする。

手順:

1. バッファ内全候補に対して `score(x)` を計算する
2. source / project ごとに分離された統計状態を読む
3. `score(x)` と動的しきい値 `theta_t` を比較する
4. `theta_t` を超えた候補のみ表示対象にする
5. スコア順に並べる
6. 表示件数は最大 `5`
7. 残りはアーカイブまたは保留キューへ送る

これにより、候補が薄い日に無理にノイズを表示しない。

### 11.1 動的しきい値

固定しきい値は採用しない。  
スマホ、RSS、X、GitHub Star、Share Sheet から流入するスコア分布は同一ではないため、`threshold = 0.72` のような単一境界はすぐ破綻する。

移動平均フィルターは raw embedding には適用しない。  
適用対象は、Rank 層で計算された scalar score と、その通過ラインである `theta_t` のみである。

`theta_t` は以下で更新する。

`candidate_t = max(EWMA_mean_t + k_t * EWMA_std_t, moving_quantile_t)`

`theta_t = beta * theta_{t-1} + (1 - beta) * candidate_t`

ここで:

- `EWMA_mean_t`: 直近スコアの移動平均
- `EWMA_std_t`: 直近スコアの移動標準偏差
- `moving_quantile_t`: 目標通過率に対応する上位分位点
- `k_t`: 通過率フィードバックで上下する厳しさ

MVP の目標通過率は `3%` とし、設定可能範囲は `1% - 10%` に制限する。

直近通過率が目標より高い場合:

`k_t <- k_t + step`

直近通過率が目標より低い場合:

`k_t <- k_t - step`

これにより、ノイズが多い入力源ではしきい値が上がり、有効情報が少ない入力源では全拒否に張り付かない。

### 11.2 source / project 別統計

しきい値統計は全入力で共有しない。

`sourceType::projectId`

を統計キーとして、以下を分離保持する。

- EWMA mean
- EWMA variance
- moving quantile window
- recent pass window
- current threshold
- current `k`

`GitHub Star`、`RSS`、`X Bookmark`、`Share Sheet` は同じ分布として扱わない。  
同じ source でも project が違えば別文脈として分離できるようにする。

### 11.3 cold start

最低サンプル数に達するまでは、適応しきい値を厳しくしすぎない。

cold start では:

- 初期しきい値を使う
- サンプルが少し溜まったら軽い moving quantile fallback を使う
- source prior が高い入力源はわずかに通しやすくする
- ただし `theta_min` / `theta_max` の上下限は必ず守る

### 11.4 実装位置

第2ステップの実装は以下に置く。

`app/lib/hopperAdaptiveFilter.ts`

このモジュールは以下を行う。

- `V_short`, `V_work`, `V_long`, `M_reject`, `M_open` を分離入力として受け取る
- embedding を単一のユーザー関心ベクトルへ平均化しない
- 複合スコアを scalar score に変換する
- EWMA mean / variance、moving quantile、recent pass rate で `theta_t` を更新する
- duplicate penalty を適用する
- reject penalty に上限を置く
- `decision_ms` / `dwell_ms` を直接の重要度ラベルにしない
- 判定結果として `score`, `threshold`, `accepted`, `passRate`, `k`, `reasonCodes` を返す

Hopper MVP 全体のコア実装は以下に置く。

`app/lib/hopperEngine.ts`

このモジュールは以下を行う。

- `Understand`: 入力を正規化し、summary / semantic topics / normalized embedding を作る
- `Merge`: URL、repo、高類似 embedding、近接時間で候補をクラスタ化する
- `Rank`: canonical item に対して `HopperAdaptiveFilter` を適用する
- `Memory`: `V_short`, `V_long`, `M_reject`, `M_open` を判断ログから分離更新する
- `Judgment`: `open / defer / archive` のログを保存し、後続ランキングの behavior prior に反映する
- `Display`: accepted item のみをスコア順に並べ、最大5件に制限する

テストは以下に置く。

`tests/hopperEngine.test.mts`

検証対象:

- Understand が embedding を正規化し、単一ユーザー関心ベクトルへ潰さないこと
- Merge が URL / source / embedding 類似度でクラスタ化すること
- Rank が accepted item のみを最大5件で返すこと
- `open / defer / archive` が各メモリを分離更新すること
- adaptive threshold が source / project ごとに分離されること
- duplicate penalty と reject penalty cap が効くこと

## 12. 迷い時間の扱い

`decision_ms` と `dwell_ms` は重要だが、そのまま重要度に直結させない。

解釈:

- 速い keep: 明確な一致の可能性
- 遅い keep: 高価値だが要確認の可能性
- 速い discard: 強い非一致の可能性
- 長い open: 興味は高いが判断未確定の可能性

ただし、疲労、UI慣れ、時間帯、デバイス状態に影響されるため、補助信号として扱う。

## 13. MVP で実装する範囲

MVP で本当に必要なのは以下だけである。

- Understand 層による `v_input`、要約、タグの生成
- Merge 層による最低限の重複排除
- `V_work`, `V_short`, `V_long`, `M_reject` の4状態
- `open / defer / archive` のログ
- 複合スコアによる候補選別
- source / project 別の動的しきい値
- 移動平均と分位点による上位 `1% - 10%` 抽出
- 最大5件表示

MVP でやらないこと:

- 完全自動の WorkUnit 化
- 高度なオンライン学習
- 複雑な forgetting curve 最適化
- 毎キー入力単位での過学習

## 14. WorkUnit OS への接続

Hopper のベクトル処理は最終目的ではない。  
この学習結果を WorkUnit OS の優先度学習へ接続する。

接続先:

- `ActorWeight` の文脈化
- 入力の実行転換率推定
- WorkUnit 昇格判定
- 優先度スコア補正

## 15. MOAT の定義

Hopper の参入障壁は、UI ではなくログと文脈統合にある。

中核要素:

- 現在の作業文脈
- open / defer / archive の判断ログ
- 再訪データ
- 下流の task / issue / commit への転換データ

これらが統合されて初めて、個人固有の選別モデルが成立する。

## 16. 仕様上の禁止事項

以下は初期仕様として採用しない。

- `accept` と `reject` を1本の平均ベクトルへ混ぜる
- 類似度だけで順位を決める
- 常に5件表示する
- 生コード全文をそのままコンテキスト化する
- `decision_ms` を単独で重要度と見なす

## 17. 要点

- 単一平均ベクトルではなく、分離メモリで扱う
- `Understand -> Merge -> Rank` の3段階で処理する
- `reject` は負ベクトルではなく reject メモリとして扱う
- スコアは複数文脈の合成で決める
- 表示件数は固定ではなく最大5件
- Hopper の役割は、将来の WorkUnit OS を学習可能にすることにある
