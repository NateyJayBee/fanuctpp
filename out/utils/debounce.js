"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debounce = debounce;
// Debounce function to delay execution
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
//# sourceMappingURL=debounce.js.map