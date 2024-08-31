# Change Log

## [0.0.1]

- Pre-release changes
- (.ls)

### Added
- Themed syntax for (.ls) files. Each of the following syntaxes has its own coloring theme:
  - Remarks with (!)
  - Remarks with (//)
  - Control keywords:
    - JMP, LBL, CALL, IF, THEN, ELSE, ENDIF, END, WAIT, SKIP, CONDITION, J, L, C, AND, OR, TIMEOUT, SELECT, RUN, LOCK, UNLOCK, PREG, ABORT, PAUSE
  - Constant language keywords:
    - UTOOL_NUM, UFRAME_NUM, UTOOL, UFRAME, OVERRIDE, RSR, UALM, PAYLOAD, TIMER, DI, DO, GI, GO, RI, RO, UI, UO, SI, SO, SPI, SPO, SSI, SSO, CSI, CSO, AR, SR, GO, F, M, PR, UF, UT, CONFIG, X, Y, Z, W, P, R
  - Move types:
    - CNT, FINE
  - I/O signals:
    - ON, OFF
  - Header section:
    - /PROG through /MN, /POS, /END
  - Operators:
    - +, -, <, >, =, !, %
  - Labels:
    - R[123:My label here]
    - PR[123:My label here]
  - System Variables:
    - $strings $that $begin $with $a $
  - Any Numbers outside of the header
  - TP line numbers