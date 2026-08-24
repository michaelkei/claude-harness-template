# セキュリティ設定（2-2 ハンズオン②）— コピペで完了

このファイルの **配布プロンプト** をコピーして Claude Code に貼るだけで、セキュリティの土台が整います。
スライドからコピーすると崩れやすいので、**このファイルから直接コピー**してください。

- **1（必須）** … メルカリ基準の物理ブロック（全OS共通）
- **2（任意・発展）** … deny を二重化する検知フック（全OS対応／hookの詳細は 2-4）

> Windows の方へ: **1 は全OSで動きます**（`settings.json` だけ）。2 も Node 版なので Windows / Mac / Linux すべてで動きます。

---

## 1.（必須）deny リスト ＋ bypass 無効化

**何をするか**: `~/.claude/settings.json` に「絶対に実行させないコマンド／ファイル」を登録し、
危険な bypass モード（`--dangerously-skip-permissions`）の起動自体を機械的に封じます。

📋 **配布プロンプト**（これをコピーして Claude Code に貼る）:

```
~/.claude/settings.json を作成してください（すでにある場合は既存の deny を壊さず追記マージ）。
permissions.deny に次の項目を登録し、permissions.disableBypassPermissionsMode を "disable" にしてください。
完了後、~/.claude/settings.json の中身を表示してください。

deny に入れる項目（先頭の // は「パソコン全体」を意味します。省略しないでください）:
- Read(//**/.ssh/**) / Edit(//**/.ssh/**)
- Read(//**/.aws/**) / Edit(//**/.aws/**)
- Read(//**/*.pem) / Edit(//**/*.pem)
- Read(//**/.env) / Read(//**/.env.*) / Edit(//**/.env) / Edit(//**/.env.*)
- Bash(rm -rf *) / Bash(rm -r *) / Bash(rm -fr *)
- Bash(sudo *)
- Bash(curl * | sh) / Bash(curl * | bash)
- Bash(git push --force*) / Bash(git push -f*)
- Bash(git reset --hard*) / Bash(git clean -fd*) / Bash(git clean -f*)

Windows の方は、上の Bash(...) をそのまま入れたうえで、次の PowerShell(...) も追加してください。
Windows では Claude Code が PowerShell を主なシェルとして使うため、Bash(...) だけでは素通りします:
- PowerShell(Remove-Item *)
- PowerShell(Invoke-Expression *)
- PowerShell(sudo *) / PowerShell(Start-Process *RunAs*)
- PowerShell(git push --force*) / PowerShell(git push -f*)
- PowerShell(git reset --hard*) / PowerShell(git clean -fd*) / PowerShell(git clean -f*)

Write(...) というルールは追加しないでください（Claude Code の仕様上そのルールは照合されず、
起動時に警告が出ます）。Edit(...) が書き込み系すべてをカバーします。

あわせて、同じ settings.json のトップレベルに次の2つも入れてください:
- "cleanupPeriodDays": 30
- "env": { "DISABLE_FEEDBACK_COMMAND": "1" }
```

> **この2つは何をしているか**
> - `cleanupPeriodDays` … PCの中に残る会話ログ（`~/.claude/projects/`）の保存日数。既定と同じ30日を明示しておき、短くしたい人は数字を変えるだけで済むようにしています
> - `DISABLE_FEEDBACK_COMMAND` … `/feedback`・`/bug`・`/share` を無効にします。これらはClaude Code自体の不具合をAnthropicに報告するコマンドで、**打つと会話履歴（AIが読んだファイルの中身を含む）が送信され5年間保持**されます。業務データを扱う人が誤って打たないよう、最初から止めておきます

**完了確認**: `~/.claude/settings.json` に `deny` と `disableBypassPermissionsMode: "disable"` が入っていればOK。

> ⚠️ **先頭の `//` を省略しないでください**（2026-07-30 更新）
>
> `Read(**/.env)` と書くと、**Claude Code を起動したフォルダの下しか守られません**。別の案件フォルダやホーム直下の `.env` は素通りします。`//` を付けるとパソコン全体が対象になります。
>
> 鍵も**ファイル名ではなく置き場所で**守ります。`~/.ssh/id_*` では `id_` で始まらない鍵（`my-server-key` など）が守られないためです。

> これでメルカリ社「Claude Code Meetup Tokyo 2026」発表の5項目（bypass禁止 / curl確認 / .env禁止 / sudo禁止 / セキュリティポリシー埋め込み）の土台が揃います（ポリシー埋め込みはハンズオン④のグローバル CLAUDE.md 側）。

---

## 2.（任意・発展）危険コマンド検知フックで二重化

**何をするか**: deny がまれに効かない不具合報告（GitHub #8961 等）の「保険」として、
コマンド実行の直前に内容を検査し、危険なものを止める **PreToolUse フック**を足します。
**hook の仕組みは 2-4 で詳しく扱います**ので、ここは「入れておくだけ」でOK。

- 検知内容: `rm -rf` / `rm -r` / `git push --force` / `git reset --hard` / `git clean -f` / `.env` 読み取り / SSH秘密鍵読み取り
- **Node 版なので全OS対応・jq不要**（Node は Claude Code の必須環境）
- 実体ファイルは同梱の `security/block-dangerous-commands.js`

📋 **配布プロンプト**（これをコピーして Claude Code に貼る）:

```
このプロジェクト内の security/block-dangerous-commands.js を、私の Claude 設定の
スクリプト用ディレクトリ（~/.claude/scripts/ ）にコピーしてください。
次に ~/.claude/settings.json の hooks.PreToolUse に、matcher "Bash|PowerShell" で
「node <コピー先の絶対パス>」を実行する hook として登録してください
（私のOSに合った正しい絶対パス表記で。既存の設定は壊さず追記）。
登録後、Claude Code の再起動を促し、危険コマンド（例: rm -rf ./dummy）が
🚫 でブロックされることを1回だけテストしてください。
```

**完了確認**: Claude Code を再起動後、`rm -rf ./dummy` 等を依頼して「🚫 ブロック」と出れば成功。

> このフックは deny と役割が重なる「保険」です。**1（deny）だけでも標準は確保されますが、1と2の両方を入れるのが確実です。**
> deny の `Bash(...)` は書いた文字列の前方一致で判定するため、`rm -rf` と書いたルールはフラグの綴りを変えた形（`rm -fR` など）までは捕まえません。2 のフックは正規表現で判定するので、そうした書き換えにも反応します。
> （Windows 側の `PowerShell(...)` はエイリアスを正規化して判定するので、`Remove-Item` と書いたルールが `rm` `del` `erase` にも効きます）`sudo` と `curl | bash` は deny 側でブロック済みのため、このフックには含めていません（deny とフックで全体をカバーする設計）。
