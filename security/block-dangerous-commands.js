#!/usr/bin/env node
// Claude Code PreToolUse hook: 破壊的コマンドをブロック（deny設定の二重化・保険）
// 全OS対応（Nodeで実行・jq/bash不要）。Claude Code が必須とする Node でそのまま動く。
// 検知: rm再帰 / git push --force / git reset --hard / git clean -f / .env読み取り / SSH秘密鍵読み取り
//
// 使い方: ~/.claude/scripts/ に置き、~/.claude/settings.json の hooks.PreToolUse に
//   matcher "Bash"・command "node <このファイルの絶対パス>" で登録する。

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let command = "";
  try {
    const data = JSON.parse(input || "{}");
    command = (data.tool_input && data.tool_input.command) || "";
  } catch {
    // 解析できなければ通す（フック自体で誤爆させない）
    process.exit(0);
  }
  if (!command) process.exit(0);

  // [正規表現, ブロック理由] — bash版 block-dangerous-commands.sh と同一の検知ルール
  const rules = [
    [/(^|[;&|]\s*)rm\s+(-[a-zA-Z]*r|-[a-zA-Z]*f[a-zA-Z]*r|--recursive)/, "rm -rf / rm -r（再帰削除）は禁止されています"],
    [/git\s+push\s+.*(-f|--force)/, "git push --force は禁止されています"],
    [/git\s+reset\s+--hard/, "git reset --hard は禁止されています"],
    [/git\s+clean\s+-[a-zA-Z]*f/, "git clean -f は禁止されています"],
    [/(cat|less|more|head|tail|source|\.)\s+.*\.env/, ".envファイルへのアクセスは禁止されています"],
    [/(cat|less|more|head|tail)\s+.*\.ssh\/id_/, "SSH秘密鍵へのアクセスは禁止されています"],
    // --- PowerShell 系（Windows では Claude Code が PowerShell を主なシェルとして使う） ---
    [/(^|[;&|]\s*)(Remove-Item|ri|rd|rmdir|del|erase)\b[^|;&]*\s-(Recurse|Force|r\b|fo\b)/i, "Remove-Item の再帰・強制削除は禁止されています"],
    [/(Invoke-Expression\b|\|\s*iex\b)/i, "ダウンロードしたスクリプトの実行（Invoke-Expression / iex）は禁止されています"],
    [/(Get-Content|gc|type)\s+[^|;&]*\.env/i, ".envファイルへのアクセスは禁止されています"],
    [/(Get-Content|gc|type)\s+[^|;&]*\.ssh[\\/]id_/i, "SSH秘密鍵へのアクセスは禁止されています"],
    [/Start-Process\b[^|;&]*-Verb\s+RunAs/i, "管理者権限での実行（Start-Process -Verb RunAs）は禁止されています"],
  ];

  for (const [re, msg] of rules) {
    if (re.test(command)) {
      process.stderr.write(`🚫 ブロック: ${msg}\n`);
      process.exit(2); // exit 2 = Claude Code はこのツール実行をブロックする
    }
  }
  process.exit(0);
});
