on run
  set launchCmd to "/bin/zsh -lc 'if pgrep -f \"vite --port 3322 --strictPort\" >/dev/null || pgrep -f \"wait-on tcp:3322\" >/dev/null; then exit 0; fi; npm --prefix \"/Users/adrienbeyondcrypto/Desktop/Orchestra\" run dev >/tmp/orchestra-dev.log 2>&1 &'"
  do shell script launchCmd
  delay 1
  try
    tell application "Electron" to activate
  end try
  display notification "Orchestra est en lancement." with title "Orchestra Launcher"
end run
