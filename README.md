# fanuctpp README

This extension includes themed syntax for Fanuc (.ls and soon .kl) files, and minor text editor functionality.

## Features

Themed syntax for (.ls) files. Each of the following syntaxes has its own coloring theme:
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

Basic event handler to detect when a new (.ls) file is opened and when changes are made

## Requirements

None.

## Extension Settings

None

## Known Issues

None

## Release Notes

Fanuctpp pre-release 0.0.1

Pre Release:
    Created extension with themed syntax for (.ls) files
    Created first version of event handling for document changes

**Enjoy!**
