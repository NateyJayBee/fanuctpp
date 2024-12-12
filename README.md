# fanuctpp README

This extension includes themed syntax for Fanuc (.ls and soon .kl) files, and minor text editor functionality.

## Features

Themed syntax for (.ls) files. Each of the following syntaxes has its own coloring theme:
- Remarks with (!)
- Remarks with (//)
- Control keywords:
    - JMP, LBL, CALL, IF, THEN, ELSE, ENDIF, END, WAIT, SKIP, CONDITION, J, L, C, AND, OR, TIMEOUT, SELECT, RUN, LOCK, UNLOCK, PREG, ABORT, PAUSE
- Constant language keywords:
    - UTOOL_NUM, UFRAME_NUM, UTOOL, UFRAME, OVERRIDE, RSR, UALM, PAYLOAD, TIMER, DI, DO, GI, GO, RI, RO, UI, UO, SI, SO, SPI, SPO, SSI, SSO, CSI, CSO, AR, SR, GO, F, M, PR, UF, UT, CONFIG, X, Y, Z, W, P, R, VR
- Move types:
    - CNT, FINE, ACC(\d{1,3})
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

Basic event handler to detect when a new (.ls) file is opened and when changes are made.

### New Features

- **Automatic Line Renumbering**: Automatically renumbers lines in .ls files when changes are made.
- **Label Webview Command**: Provides a command to open a webview for labels.
- **Ctrl+Click to Open Filename**: Allows users to ctrl+click on a `CALL 'programName'` instance to open the corresponding file if it exists in the same directory.

## Requirements

None.

## Usage

- **Automatic Line Renumbering**: This feature is enabled by default and will automatically renumber lines in .ls files when changes are made.
CAN BE DISABLED with user setting "autoLineRenumer": false
- **Label Webview Command**: Use the command `extension.openLabelView` to open the label webview.
- **Ctrl+Click to Open Filename**: Ctrl+click on a `CALL 'programName'` instance to open the corresponding file if it exists in the same directory.

## Installation

1. Install the extension from the VS Code Marketplace.
2. Open a Fanuc (.ls) file to activate the extension.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License

[MIT](https://github.com/NateyJayBee/fanuctpp/blob/master/LICENSE.md)

## Known Issues

Some numbers may not be colored with this theme

## Release Notes

Fanuctpp release 0.0.1

Release:
    Created label webview and command to open it
    Created ctrl+click definition to open filename if in same directory as current file

Fanuctpp pre-release 0.0.1

Pre Release:
    Created extension with themed syntax for (.ls) files
    Created first version of event handling for document changes

**Enjoy!**
