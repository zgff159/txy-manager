import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

interface Props {
  connId: string;
  accountId: string;
  instanceId: string;
  region: string;
  username: string;
  password: string;
  onClose: () => void;
}

const SSHTerminal: React.FC<Props> = ({ connId, accountId, instanceId, region, username, password, onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleResize = useCallback(() => {
    if (fitAddon.current) {
      fitAddon.current.fit();
      if (term.current) {
        window.api.ssh.resize(connId, term.current.cols, term.current.rows);
      }
    }
  }, [connId]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: { background: '#1e1e1e', foreground: '#d4d4d4', cursor: '#ffffff' },
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(terminalRef.current);
    fit.fit();

    term.current = terminal;
    fitAddon.current = fit;

    terminal.onData((data) => {
      window.api.ssh.write(connId, data);
    });

    const unsub = window.api.ssh.onData((cid, data) => {
      if (cid === connId) {
        terminal.write(data);
      }
    });

    cleanupRef.current = () => {
      unsub();
      window.api.ssh.disconnect(connId);
      terminal.dispose();
    };

    window.api.ssh.connect(connId, accountId, instanceId, region, username, password);

    const resizeObserver = new ResizeObserver(() => handleResize());
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      cleanupRef.current?.();
    };
  }, [connId]);

  useEffect(() => {
    const handler = () => handleResize();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [handleResize]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 400 }}>
      <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default SSHTerminal;
