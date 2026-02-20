/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "(pages-dir-node)/./src/components/ProtectedRoute.tsx":
/*!*******************************************!*\
  !*** ./src/components/ProtectedRoute.tsx ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ ProtectedRoute)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/router */ \"(pages-dir-node)/./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _lib_supabaseClient__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/lib/supabaseClient */ \"(pages-dir-node)/./src/lib/supabaseClient.ts\");\n\n\n\n\nfunction ProtectedRoute({ children }) {\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_2__.useRouter)();\n    const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(true);\n    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)({\n        \"ProtectedRoute.useEffect\": ()=>{\n            async function checkUser() {\n                const { data: { session } } = await _lib_supabaseClient__WEBPACK_IMPORTED_MODULE_3__.supabase.auth.getSession();\n                if (!session) {\n                    router.replace(\"/login\");\n                } else {\n                    setLoading(false);\n                }\n            }\n            checkUser();\n            const { data: { subscription } } = _lib_supabaseClient__WEBPACK_IMPORTED_MODULE_3__.supabase.auth.onAuthStateChange({\n                \"ProtectedRoute.useEffect\": (_event, session)=>{\n                    if (!session) router.replace(\"/login\");\n                }\n            }[\"ProtectedRoute.useEffect\"]);\n            return ({\n                \"ProtectedRoute.useEffect\": ()=>subscription.unsubscribe()\n            })[\"ProtectedRoute.useEffect\"];\n        }\n    }[\"ProtectedRoute.useEffect\"], [\n        router\n    ]);\n    if (loading) {\n        return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n            className: \"h-screen flex items-center justify-center bg-primary-900 text-gray-300\",\n            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"p\", {\n                children: \"Verificando acesso...\"\n            }, void 0, false, {\n                fileName: \"/Users/brunoribeiro/Documents/flowdesk/src/components/ProtectedRoute.tsx\",\n                lineNumber: 36,\n                columnNumber: 9\n            }, this)\n        }, void 0, false, {\n            fileName: \"/Users/brunoribeiro/Documents/flowdesk/src/components/ProtectedRoute.tsx\",\n            lineNumber: 35,\n            columnNumber: 7\n        }, this);\n    }\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {\n        children: children\n    }, void 0, false);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9jb21wb25lbnRzL1Byb3RlY3RlZFJvdXRlLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBNEM7QUFDSjtBQUNRO0FBRWpDLFNBQVNJLGVBQWUsRUFBRUMsUUFBUSxFQUFpQztJQUNoRixNQUFNQyxTQUFTSixzREFBU0E7SUFDeEIsTUFBTSxDQUFDSyxTQUFTQyxXQUFXLEdBQUdQLCtDQUFRQSxDQUFDO0lBRXZDRCxnREFBU0E7b0NBQUM7WUFDUixlQUFlUztnQkFDYixNQUFNLEVBQ0pDLE1BQU0sRUFBRUMsT0FBTyxFQUFFLEVBQ2xCLEdBQUcsTUFBTVIseURBQVFBLENBQUNTLElBQUksQ0FBQ0MsVUFBVTtnQkFFbEMsSUFBSSxDQUFDRixTQUFTO29CQUNaTCxPQUFPUSxPQUFPLENBQUM7Z0JBQ2pCLE9BQU87b0JBQ0xOLFdBQVc7Z0JBQ2I7WUFDRjtZQUVBQztZQUVBLE1BQU0sRUFDSkMsTUFBTSxFQUFFSyxZQUFZLEVBQUUsRUFDdkIsR0FBR1oseURBQVFBLENBQUNTLElBQUksQ0FBQ0ksaUJBQWlCOzRDQUFDLENBQUNDLFFBQVFOO29CQUMzQyxJQUFJLENBQUNBLFNBQVNMLE9BQU9RLE9BQU8sQ0FBQztnQkFDL0I7O1lBRUE7NENBQU8sSUFBTUMsYUFBYUcsV0FBVzs7UUFDdkM7bUNBQUc7UUFBQ1o7S0FBTztJQUVYLElBQUlDLFNBQVM7UUFDWCxxQkFDRSw4REFBQ1k7WUFBSUMsV0FBVTtzQkFDYiw0RUFBQ0M7MEJBQUU7Ozs7Ozs7Ozs7O0lBR1Q7SUFFQSxxQkFBTztrQkFBR2hCOztBQUNaIiwic291cmNlcyI6WyIvVXNlcnMvYnJ1bm9yaWJlaXJvL0RvY3VtZW50cy9mbG93ZGVzay9zcmMvY29tcG9uZW50cy9Qcm90ZWN0ZWRSb3V0ZS50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgdXNlUm91dGVyIH0gZnJvbSBcIm5leHQvcm91dGVyXCI7XG5pbXBvcnQgeyBzdXBhYmFzZSB9IGZyb20gXCJAL2xpYi9zdXBhYmFzZUNsaWVudFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBQcm90ZWN0ZWRSb3V0ZSh7IGNoaWxkcmVuIH06IHsgY2hpbGRyZW46IFJlYWN0LlJlYWN0Tm9kZSB9KSB7XG4gIGNvbnN0IHJvdXRlciA9IHVzZVJvdXRlcigpO1xuICBjb25zdCBbbG9hZGluZywgc2V0TG9hZGluZ10gPSB1c2VTdGF0ZSh0cnVlKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGFzeW5jIGZ1bmN0aW9uIGNoZWNrVXNlcigpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgZGF0YTogeyBzZXNzaW9uIH0sXG4gICAgICB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRTZXNzaW9uKCk7XG5cbiAgICAgIGlmICghc2Vzc2lvbikge1xuICAgICAgICByb3V0ZXIucmVwbGFjZShcIi9sb2dpblwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNldExvYWRpbmcoZmFsc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNoZWNrVXNlcigpO1xuXG4gICAgY29uc3Qge1xuICAgICAgZGF0YTogeyBzdWJzY3JpcHRpb24gfSxcbiAgICB9ID0gc3VwYWJhc2UuYXV0aC5vbkF1dGhTdGF0ZUNoYW5nZSgoX2V2ZW50LCBzZXNzaW9uKSA9PiB7XG4gICAgICBpZiAoIXNlc3Npb24pIHJvdXRlci5yZXBsYWNlKFwiL2xvZ2luXCIpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuICgpID0+IHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICB9LCBbcm91dGVyXSk7XG5cbiAgaWYgKGxvYWRpbmcpIHtcbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJoLXNjcmVlbiBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBiZy1wcmltYXJ5LTkwMCB0ZXh0LWdyYXktMzAwXCI+XG4gICAgICAgIDxwPlZlcmlmaWNhbmRvIGFjZXNzby4uLjwvcD5cbiAgICAgIDwvZGl2PlxuICAgICk7XG4gIH1cblxuICByZXR1cm4gPD57Y2hpbGRyZW59PC8+O1xufVxuIl0sIm5hbWVzIjpbInVzZUVmZmVjdCIsInVzZVN0YXRlIiwidXNlUm91dGVyIiwic3VwYWJhc2UiLCJQcm90ZWN0ZWRSb3V0ZSIsImNoaWxkcmVuIiwicm91dGVyIiwibG9hZGluZyIsInNldExvYWRpbmciLCJjaGVja1VzZXIiLCJkYXRhIiwic2Vzc2lvbiIsImF1dGgiLCJnZXRTZXNzaW9uIiwicmVwbGFjZSIsInN1YnNjcmlwdGlvbiIsIm9uQXV0aFN0YXRlQ2hhbmdlIiwiX2V2ZW50IiwidW5zdWJzY3JpYmUiLCJkaXYiLCJjbGFzc05hbWUiLCJwIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/components/ProtectedRoute.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./src/lib/supabaseClient.ts":
/*!***********************************!*\
  !*** ./src/lib/supabaseClient.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   supabase: () => (/* binding */ supabase)\n/* harmony export */ });\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/supabase-js */ \"@supabase/supabase-js\");\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__);\n\nconst supabaseUrl = \"https://hcnssdxsajfdwvbcfxkq.supabase.co\";\nconst supabaseAnonKey = \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbnNzZHhzYWpmZHd2YmNmeGtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NjY1MzksImV4cCI6MjA3NjI0MjUzOX0.W8S6KSpZIr4LA023UUnenn4bTe5RlzRQaxNi9XNpZjw\";\nconst supabase = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)(supabaseUrl, supabaseAnonKey);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9saWIvc3VwYWJhc2VDbGllbnQudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQXFEO0FBRXJELE1BQU1DLGNBQWNDLDBDQUFvQztBQUN4RCxNQUFNRyxrQkFBa0JILGtOQUF5QztBQUUxRCxNQUFNSyxXQUFXUCxtRUFBWUEsQ0FBQ0MsYUFBYUksaUJBQWlCIiwic291cmNlcyI6WyIvVXNlcnMvYnJ1bm9yaWJlaXJvL0RvY3VtZW50cy9mbG93ZGVzay9zcmMvbGliL3N1cGFiYXNlQ2xpZW50LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIjtcblxuY29uc3Qgc3VwYWJhc2VVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwhO1xuY29uc3Qgc3VwYWJhc2VBbm9uS2V5ID0gcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVkhO1xuXG5leHBvcnQgY29uc3Qgc3VwYWJhc2UgPSBjcmVhdGVDbGllbnQoc3VwYWJhc2VVcmwsIHN1cGFiYXNlQW5vbktleSk7Il0sIm5hbWVzIjpbImNyZWF0ZUNsaWVudCIsInN1cGFiYXNlVXJsIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCIsInN1cGFiYXNlQW5vbktleSIsIk5FWFRfUFVCTElDX1NVUEFCQVNFX0FOT05fS0VZIiwic3VwYWJhc2UiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/lib/supabaseClient.ts\n");

/***/ }),

/***/ "(pages-dir-node)/./src/pages/_app.tsx":
/*!****************************!*\
  !*** ./src/pages/_app.tsx ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _components_ProtectedRoute__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/components/ProtectedRoute */ \"(pages-dir-node)/./src/components/ProtectedRoute.tsx\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/styles/globals.css */ \"(pages-dir-node)/./src/styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_3__);\n\n\n\n\nconst PROTECTED_ROUTES = [\n    \"/dashboard\"\n];\nfunction App({ Component, pageProps, router }) {\n    const isProtected = PROTECTED_ROUTES.some((path)=>router.pathname.startsWith(path));\n    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)({\n        \"App.useEffect\": ()=>{\n            if (true) return;\n            const loadTheme = {\n                \"App.useEffect.loadTheme\": ()=>{\n                    const selectedTheme = localStorage.getItem(\"flowdesk_theme\") || \"default\";\n                    const old = document.getElementById(\"flowdesk-theme\");\n                    if (old) old.remove();\n                    const link = document.createElement(\"link\");\n                    link.rel = \"stylesheet\";\n                    link.id = \"flowdesk-theme\";\n                    link.href = `/styles/themes/${selectedTheme}.css`;\n                    document.head.appendChild(link);\n                }\n            }[\"App.useEffect.loadTheme\"];\n            loadTheme();\n            const handler = {\n                \"App.useEffect.handler\": ()=>loadTheme()\n            }[\"App.useEffect.handler\"];\n            window.addEventListener(\"flowdesk:theme-updated\", handler);\n            return ({\n                \"App.useEffect\": ()=>window.removeEventListener(\"flowdesk:theme-updated\", handler)\n            })[\"App.useEffect\"];\n        }\n    }[\"App.useEffect\"], []);\n    if (isProtected) {\n        return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_ProtectedRoute__WEBPACK_IMPORTED_MODULE_1__[\"default\"], {\n            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                ...pageProps\n            }, void 0, false, {\n                fileName: \"/Users/brunoribeiro/Documents/flowdesk/src/pages/_app.tsx\",\n                lineNumber: 45,\n                columnNumber: 9\n            }, this)\n        }, void 0, false, {\n            fileName: \"/Users/brunoribeiro/Documents/flowdesk/src/pages/_app.tsx\",\n            lineNumber: 44,\n            columnNumber: 7\n        }, this);\n    }\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n        ...pageProps\n    }, void 0, false, {\n        fileName: \"/Users/brunoribeiro/Documents/flowdesk/src/pages/_app.tsx\",\n        lineNumber: 50,\n        columnNumber: 10\n    }, this);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFDeUQ7QUFDM0I7QUFDSTtBQUVsQyxNQUFNRSxtQkFBbUI7SUFBQztDQUFhO0FBRXhCLFNBQVNDLElBQUksRUFBRUMsU0FBUyxFQUFFQyxTQUFTLEVBQUVDLE1BQU0sRUFBWTtJQUNwRSxNQUFNQyxjQUFjTCxpQkFBaUJNLElBQUksQ0FBQyxDQUFDQyxPQUN6Q0gsT0FBT0ksUUFBUSxDQUFDQyxVQUFVLENBQUNGO0lBRzdCUixnREFBU0E7eUJBQUM7WUFDUixJQUFJLElBQTZCLEVBQUU7WUFFbkMsTUFBTVc7MkNBQVk7b0JBQ2hCLE1BQU1DLGdCQUNKQyxhQUFhQyxPQUFPLENBQUMscUJBQXFCO29CQUU1QyxNQUFNQyxNQUFNQyxTQUFTQyxjQUFjLENBQUM7b0JBQ3BDLElBQUlGLEtBQUtBLElBQUlHLE1BQU07b0JBRW5CLE1BQU1DLE9BQU9ILFNBQVNJLGFBQWEsQ0FBQztvQkFDcENELEtBQUtFLEdBQUcsR0FBRztvQkFDWEYsS0FBS0csRUFBRSxHQUFHO29CQUVWSCxLQUFLSSxJQUFJLEdBQUcsQ0FBQyxlQUFlLEVBQUVYLGNBQWMsSUFBSSxDQUFDO29CQUVqREksU0FBU1EsSUFBSSxDQUFDQyxXQUFXLENBQUNOO2dCQUM1Qjs7WUFFQVI7WUFFQSxNQUFNZTt5Q0FBVSxJQUFNZjs7WUFFdEJnQixPQUFPQyxnQkFBZ0IsQ0FBQywwQkFBMEJGO1lBRWxEO2lDQUFPLElBQ0xDLE9BQU9FLG1CQUFtQixDQUFDLDBCQUEwQkg7O1FBQ3pEO3dCQUFHLEVBQUU7SUFFTCxJQUFJcEIsYUFBYTtRQUNmLHFCQUNFLDhEQUFDUCxrRUFBY0E7c0JBQ2IsNEVBQUNJO2dCQUFXLEdBQUdDLFNBQVM7Ozs7Ozs7Ozs7O0lBRzlCO0lBRUEscUJBQU8sOERBQUNEO1FBQVcsR0FBR0MsU0FBUzs7Ozs7O0FBQ2pDIiwic291cmNlcyI6WyIvVXNlcnMvYnJ1bm9yaWJlaXJvL0RvY3VtZW50cy9mbG93ZGVzay9zcmMvcGFnZXMvX2FwcC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBBcHBQcm9wcyB9IGZyb20gXCJuZXh0L2FwcFwiO1xuaW1wb3J0IFByb3RlY3RlZFJvdXRlIGZyb20gXCJAL2NvbXBvbmVudHMvUHJvdGVjdGVkUm91dGVcIjtcbmltcG9ydCBcIkAvc3R5bGVzL2dsb2JhbHMuY3NzXCI7XG5pbXBvcnQgeyB1c2VFZmZlY3QgfSBmcm9tIFwicmVhY3RcIjtcblxuY29uc3QgUFJPVEVDVEVEX1JPVVRFUyA9IFtcIi9kYXNoYm9hcmRcIl07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFwcCh7IENvbXBvbmVudCwgcGFnZVByb3BzLCByb3V0ZXIgfTogQXBwUHJvcHMpIHtcbiAgY29uc3QgaXNQcm90ZWN0ZWQgPSBQUk9URUNURURfUk9VVEVTLnNvbWUoKHBhdGgpID0+XG4gICAgcm91dGVyLnBhdGhuYW1lLnN0YXJ0c1dpdGgocGF0aClcbiAgKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm47XG5cbiAgICBjb25zdCBsb2FkVGhlbWUgPSAoKSA9PiB7XG4gICAgICBjb25zdCBzZWxlY3RlZFRoZW1lID1cbiAgICAgICAgbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJmbG93ZGVza190aGVtZVwiKSB8fCBcImRlZmF1bHRcIjtcblxuICAgICAgY29uc3Qgb2xkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJmbG93ZGVzay10aGVtZVwiKTtcbiAgICAgIGlmIChvbGQpIG9sZC5yZW1vdmUoKTtcblxuICAgICAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaW5rXCIpO1xuICAgICAgbGluay5yZWwgPSBcInN0eWxlc2hlZXRcIjtcbiAgICAgIGxpbmsuaWQgPSBcImZsb3dkZXNrLXRoZW1lXCI7XG5cbiAgICAgIGxpbmsuaHJlZiA9IGAvc3R5bGVzL3RoZW1lcy8ke3NlbGVjdGVkVGhlbWV9LmNzc2A7XG5cbiAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQobGluayk7XG4gICAgfTtcblxuICAgIGxvYWRUaGVtZSgpO1xuXG4gICAgY29uc3QgaGFuZGxlciA9ICgpID0+IGxvYWRUaGVtZSgpO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJmbG93ZGVzazp0aGVtZS11cGRhdGVkXCIsIGhhbmRsZXIpO1xuXG4gICAgcmV0dXJuICgpID0+XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImZsb3dkZXNrOnRoZW1lLXVwZGF0ZWRcIiwgaGFuZGxlcik7XG4gIH0sIFtdKTtcblxuICBpZiAoaXNQcm90ZWN0ZWQpIHtcbiAgICByZXR1cm4gKFxuICAgICAgPFByb3RlY3RlZFJvdXRlPlxuICAgICAgICA8Q29tcG9uZW50IHsuLi5wYWdlUHJvcHN9IC8+XG4gICAgICA8L1Byb3RlY3RlZFJvdXRlPlxuICAgICk7XG4gIH1cblxuICByZXR1cm4gPENvbXBvbmVudCB7Li4ucGFnZVByb3BzfSAvPjtcbn0iXSwibmFtZXMiOlsiUHJvdGVjdGVkUm91dGUiLCJ1c2VFZmZlY3QiLCJQUk9URUNURURfUk9VVEVTIiwiQXBwIiwiQ29tcG9uZW50IiwicGFnZVByb3BzIiwicm91dGVyIiwiaXNQcm90ZWN0ZWQiLCJzb21lIiwicGF0aCIsInBhdGhuYW1lIiwic3RhcnRzV2l0aCIsImxvYWRUaGVtZSIsInNlbGVjdGVkVGhlbWUiLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwib2xkIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsInJlbW92ZSIsImxpbmsiLCJjcmVhdGVFbGVtZW50IiwicmVsIiwiaWQiLCJocmVmIiwiaGVhZCIsImFwcGVuZENoaWxkIiwiaGFuZGxlciIsIndpbmRvdyIsImFkZEV2ZW50TGlzdGVuZXIiLCJyZW1vdmVFdmVudExpc3RlbmVyIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/pages/_app.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./src/styles/globals.css":
/*!********************************!*\
  !*** ./src/styles/globals.css ***!
  \********************************/
/***/ (() => {



/***/ }),

/***/ "@supabase/supabase-js":
/*!****************************************!*\
  !*** external "@supabase/supabase-js" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("@supabase/supabase-js");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "next/dist/compiled/next-server/pages.runtime.dev.js":
/*!**********************************************************************!*\
  !*** external "next/dist/compiled/next-server/pages.runtime.dev.js" ***!
  \**********************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/pages.runtime.dev.js");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react-dom":
/*!****************************!*\
  !*** external "react-dom" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("react-dom");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "react/jsx-runtime":
/*!************************************!*\
  !*** external "react/jsx-runtime" ***!
  \************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-runtime");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@swc"], () => (__webpack_exec__("(pages-dir-node)/./src/pages/_app.tsx")));
module.exports = __webpack_exports__;

})();