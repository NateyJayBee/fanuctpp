# fanuctpp README

This extension is for Fanuc proprietary Teach Pendant Programming. It contains a defined syntax and custom theme, as well as multiple coding efficiency, autofill features, commands, and interactive webviews.

## Features

Themed syntax for (.ls) files. Each of the following syntaxes has its own coloring theme:
- Remarks with (!)
- Remarks with (//)
- Control keywords:
    - JMP, LBL, CALL, IF, THEN, ELSE, ENDIF, END, WAIT, SKIP, CONDITION, J, L, C, AND, OR, TIMEOUT, SELECT, RUN, LOCK, UNLOCK, PREG, ABORT, PAUSE
- Constant language keywords:
    - UTOOL_NUM, UFRAME_NUM, UTOOL, UFRAME, OVERRIDE, RSR, UALM, PAYLOAD, TIMER, DI, DO, GI, GO, RI, RO, UI, UO, SI, SO, SPI, SPO, SSI, SSO, CSI, CSO, AR, SR, GO, F, M, PR, UF, UT, CONFIG, X, Y, Z, W, P, R, VR
- Move types:
    - CNT, FINE, ACC
- I/O signals:
    - ON, OFF
- Header section:
    - /PROG through /MN, /POS, /END
- Operators:
    - +, -, <, >, =, !, %
- Labels:
    - R[123:My label here]
    - PR[123:My label here]
- System variables
- TP line numbers

Basic event handler to detect when a new (.ls) file is opened and when changes are made.

- **Automatic Line Renumbering**: Automatically renumbers in-text lines in .ls files when changes are made.
- **Automatic Semicolon Placement**: Attached to Line Renumbering, ends in-text lines in .ls files with ";"
- **Label Webview Command**: Provides a command to open a webview for labels.
- **Ctrl+Click to Open Filename**: Allows users to ctrl+click on a `CALL 'programName'` instance to open the corresponding file if it exists in the same directory.

## Requirements

VS Code 1.95.0

## Usage

- **Automatic Line Renumbering**: This feature is enabled by default and will automatically renumber lines in .ls files when changes are made.
CAN BE DISABLED with user setting "autoLineRenumber": false
- **Label Webview Command**: Use the command `extension.openLabelView` to open the label webview. Ctrl+Shift+P
- **Ctrl+Click to Open Filename**: Ctrl+click on a `CALL 'programName'` instance to open the corresponding file if it exists in the same directory.

## Installation

1. Install the extension from the VS Code Marketplace.

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
    Created ctrl+click definition to open filename if it's in the same directory as current file

Fanuctpp pre-release 0.0.1

Pre Release:
    Created extension with themed syntax for (.ls) files
    Created first version of event handling for document changes

**Enjoy!**
