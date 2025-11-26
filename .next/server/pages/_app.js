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
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ ProtectedRoute)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/router */ \"(pages-dir-node)/./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _lib_supabaseClient__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/lib/supabaseClient */ \"(pages-dir-node)/./src/lib/supabaseClient.ts\");\n\n\n\n\nfunction ProtectedRoute({ children }) {\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_2__.useRouter)();\n    const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(true);\n    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)({\n        \"ProtectedRoute.useEffect\": ()=>{\n            async function checkUser() {\n                const { data: { session } } = await _lib_supabaseClient__WEBPACK_IMPORTED_MODULE_3__.supabase.auth.getSession();\n                // Se não estiver logado → redireciona pro login\n                if (!session) {\n                    router.replace(\"/login\");\n                } else {\n                    setLoading(false);\n                }\n            }\n            checkUser();\n            // Listener pra detectar logout em tempo real\n            const { data: { subscription } } = _lib_supabaseClient__WEBPACK_IMPORTED_MODULE_3__.supabase.auth.onAuthStateChange({\n                \"ProtectedRoute.useEffect\": (_event, session)=>{\n                    if (!session) router.replace(\"/login\");\n                }\n            }[\"ProtectedRoute.useEffect\"]);\n            return ({\n                \"ProtectedRoute.useEffect\": ()=>subscription.unsubscribe()\n            })[\"ProtectedRoute.useEffect\"];\n        }\n    }[\"ProtectedRoute.useEffect\"], [\n        router\n    ]);\n    if (loading) {\n        return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n            className: \"h-screen flex items-center justify-center bg-primary-900 text-gray-300\",\n            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"p\", {\n                children: \"Verificando acesso...\"\n            }, void 0, false, {\n                fileName: \"/Users/brunoribeiro/Documents/flowdesk/src/components/ProtectedRoute.tsx\",\n                lineNumber: 38,\n                columnNumber: 9\n            }, this)\n        }, void 0, false, {\n            fileName: \"/Users/brunoribeiro/Documents/flowdesk/src/components/ProtectedRoute.tsx\",\n            lineNumber: 37,\n            columnNumber: 7\n        }, this);\n    }\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {\n        children: children\n    }, void 0, false);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9jb21wb25lbnRzL1Byb3RlY3RlZFJvdXRlLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBNEM7QUFDSjtBQUNRO0FBRWpDLFNBQVNJLGVBQWUsRUFBRUMsUUFBUSxFQUFpQztJQUNoRixNQUFNQyxTQUFTSixzREFBU0E7SUFDeEIsTUFBTSxDQUFDSyxTQUFTQyxXQUFXLEdBQUdQLCtDQUFRQSxDQUFDO0lBRXZDRCxnREFBU0E7b0NBQUM7WUFDUixlQUFlUztnQkFDYixNQUFNLEVBQ0pDLE1BQU0sRUFBRUMsT0FBTyxFQUFFLEVBQ2xCLEdBQUcsTUFBTVIseURBQVFBLENBQUNTLElBQUksQ0FBQ0MsVUFBVTtnQkFFbEMsZ0RBQWdEO2dCQUNoRCxJQUFJLENBQUNGLFNBQVM7b0JBQ1pMLE9BQU9RLE9BQU8sQ0FBQztnQkFDakIsT0FBTztvQkFDTE4sV0FBVztnQkFDYjtZQUNGO1lBRUFDO1lBRUEsNkNBQTZDO1lBQzdDLE1BQU0sRUFDSkMsTUFBTSxFQUFFSyxZQUFZLEVBQUUsRUFDdkIsR0FBR1oseURBQVFBLENBQUNTLElBQUksQ0FBQ0ksaUJBQWlCOzRDQUFDLENBQUNDLFFBQVFOO29CQUMzQyxJQUFJLENBQUNBLFNBQVNMLE9BQU9RLE9BQU8sQ0FBQztnQkFDL0I7O1lBRUE7NENBQU8sSUFBTUMsYUFBYUcsV0FBVzs7UUFDdkM7bUNBQUc7UUFBQ1o7S0FBTztJQUVYLElBQUlDLFNBQVM7UUFDWCxxQkFDRSw4REFBQ1k7WUFBSUMsV0FBVTtzQkFDYiw0RUFBQ0M7MEJBQUU7Ozs7Ozs7Ozs7O0lBR1Q7SUFFQSxxQkFBTztrQkFBR2hCOztBQUNaIiwic291cmNlcyI6WyIvVXNlcnMvYnJ1bm9yaWJlaXJvL0RvY3VtZW50cy9mbG93ZGVzay9zcmMvY29tcG9uZW50cy9Qcm90ZWN0ZWRSb3V0ZS50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgdXNlUm91dGVyIH0gZnJvbSBcIm5leHQvcm91dGVyXCI7XG5pbXBvcnQgeyBzdXBhYmFzZSB9IGZyb20gXCJAL2xpYi9zdXBhYmFzZUNsaWVudFwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBQcm90ZWN0ZWRSb3V0ZSh7IGNoaWxkcmVuIH06IHsgY2hpbGRyZW46IFJlYWN0LlJlYWN0Tm9kZSB9KSB7XG4gIGNvbnN0IHJvdXRlciA9IHVzZVJvdXRlcigpO1xuICBjb25zdCBbbG9hZGluZywgc2V0TG9hZGluZ10gPSB1c2VTdGF0ZSh0cnVlKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGFzeW5jIGZ1bmN0aW9uIGNoZWNrVXNlcigpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgZGF0YTogeyBzZXNzaW9uIH0sXG4gICAgICB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRTZXNzaW9uKCk7XG5cbiAgICAgIC8vIFNlIG7Do28gZXN0aXZlciBsb2dhZG8g4oaSIHJlZGlyZWNpb25hIHBybyBsb2dpblxuICAgICAgaWYgKCFzZXNzaW9uKSB7XG4gICAgICAgIHJvdXRlci5yZXBsYWNlKFwiL2xvZ2luXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0TG9hZGluZyhmYWxzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2hlY2tVc2VyKCk7XG5cbiAgICAvLyBMaXN0ZW5lciBwcmEgZGV0ZWN0YXIgbG9nb3V0IGVtIHRlbXBvIHJlYWxcbiAgICBjb25zdCB7XG4gICAgICBkYXRhOiB7IHN1YnNjcmlwdGlvbiB9LFxuICAgIH0gPSBzdXBhYmFzZS5hdXRoLm9uQXV0aFN0YXRlQ2hhbmdlKChfZXZlbnQsIHNlc3Npb24pID0+IHtcbiAgICAgIGlmICghc2Vzc2lvbikgcm91dGVyLnJlcGxhY2UoXCIvbG9naW5cIik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gKCkgPT4gc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gIH0sIFtyb3V0ZXJdKTtcblxuICBpZiAobG9hZGluZykge1xuICAgIHJldHVybiAoXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImgtc2NyZWVuIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGJnLXByaW1hcnktOTAwIHRleHQtZ3JheS0zMDBcIj5cbiAgICAgICAgPHA+VmVyaWZpY2FuZG8gYWNlc3NvLi4uPC9wPlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiA8PntjaGlsZHJlbn08Lz47XG59XG4iXSwibmFtZXMiOlsidXNlRWZmZWN0IiwidXNlU3RhdGUiLCJ1c2VSb3V0ZXIiLCJzdXBhYmFzZSIsIlByb3RlY3RlZFJvdXRlIiwiY2hpbGRyZW4iLCJyb3V0ZXIiLCJsb2FkaW5nIiwic2V0TG9hZGluZyIsImNoZWNrVXNlciIsImRhdGEiLCJzZXNzaW9uIiwiYXV0aCIsImdldFNlc3Npb24iLCJyZXBsYWNlIiwic3Vic2NyaXB0aW9uIiwib25BdXRoU3RhdGVDaGFuZ2UiLCJfZXZlbnQiLCJ1bnN1YnNjcmliZSIsImRpdiIsImNsYXNzTmFtZSIsInAiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/components/ProtectedRoute.tsx\n");

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
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _components_ProtectedRoute__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/components/ProtectedRoute */ \"(pages-dir-node)/./src/components/ProtectedRoute.tsx\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/styles/globals.css */ \"(pages-dir-node)/./src/styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_3__);\n\n\n\n\nconst PROTECTED_ROUTES = [\n    \"/dashboard\"\n];\nfunction App({ Component, pageProps, router }) {\n    const isProtected = PROTECTED_ROUTES.some((path)=>router.pathname.startsWith(path));\n    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)({\n        \"App.useEffect\": ()=>{\n            if (true) return;\n            const loadTheme = {\n                \"App.useEffect.loadTheme\": ()=>{\n                    // nome correto do tema padrão:\n                    const selectedTheme = localStorage.getItem(\"flowdesk_theme\") || \"default\";\n                    // remove tema antigo\n                    const old = document.getElementById(\"flowdesk-theme\");\n                    if (old) old.remove();\n                    // cria novo <link>\n                    const link = document.createElement(\"link\");\n                    link.rel = \"stylesheet\";\n                    link.id = \"flowdesk-theme\";\n                    link.href = `/styles/themes/${selectedTheme}.css`;\n                    document.head.appendChild(link);\n                }\n            }[\"App.useEffect.loadTheme\"];\n            // carregar tema ao iniciar\n            loadTheme();\n            // recarregar tema sempre que o seletor emitir o evento\n            const handler = {\n                \"App.useEffect.handler\": ()=>loadTheme()\n            }[\"App.useEffect.handler\"];\n            window.addEventListener(\"flowdesk:theme-updated\", handler);\n            // limpeza\n            return ({\n                \"App.useEffect\": ()=>window.removeEventListener(\"flowdesk:theme-updated\", handler)\n            })[\"App.useEffect\"];\n        }\n    }[\"App.useEffect\"], []);\n    if (isProtected) {\n        return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_ProtectedRoute__WEBPACK_IMPORTED_MODULE_1__[\"default\"], {\n            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                ...pageProps\n            }, void 0, false, {\n                fileName: \"/Users/brunoribeiro/Documents/flowdesk/src/pages/_app.tsx\",\n                lineNumber: 51,\n                columnNumber: 9\n            }, this)\n        }, void 0, false, {\n            fileName: \"/Users/brunoribeiro/Documents/flowdesk/src/pages/_app.tsx\",\n            lineNumber: 50,\n            columnNumber: 7\n        }, this);\n    }\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n        ...pageProps\n    }, void 0, false, {\n        fileName: \"/Users/brunoribeiro/Documents/flowdesk/src/pages/_app.tsx\",\n        lineNumber: 56,\n        columnNumber: 10\n    }, this);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFDeUQ7QUFDM0I7QUFDSTtBQUVsQyxNQUFNRSxtQkFBbUI7SUFBQztDQUFhO0FBRXhCLFNBQVNDLElBQUksRUFBRUMsU0FBUyxFQUFFQyxTQUFTLEVBQUVDLE1BQU0sRUFBWTtJQUNwRSxNQUFNQyxjQUFjTCxpQkFBaUJNLElBQUksQ0FBQyxDQUFDQyxPQUN6Q0gsT0FBT0ksUUFBUSxDQUFDQyxVQUFVLENBQUNGO0lBRzdCUixnREFBU0E7eUJBQUM7WUFDUixJQUFJLElBQTZCLEVBQUU7WUFFbkMsTUFBTVc7MkNBQVk7b0JBQ2hCLCtCQUErQjtvQkFDL0IsTUFBTUMsZ0JBQ0pDLGFBQWFDLE9BQU8sQ0FBQyxxQkFBcUI7b0JBRTVDLHFCQUFxQjtvQkFDckIsTUFBTUMsTUFBTUMsU0FBU0MsY0FBYyxDQUFDO29CQUNwQyxJQUFJRixLQUFLQSxJQUFJRyxNQUFNO29CQUVuQixtQkFBbUI7b0JBQ25CLE1BQU1DLE9BQU9ILFNBQVNJLGFBQWEsQ0FBQztvQkFDcENELEtBQUtFLEdBQUcsR0FBRztvQkFDWEYsS0FBS0csRUFBRSxHQUFHO29CQUVWSCxLQUFLSSxJQUFJLEdBQUcsQ0FBQyxlQUFlLEVBQUVYLGNBQWMsSUFBSSxDQUFDO29CQUVqREksU0FBU1EsSUFBSSxDQUFDQyxXQUFXLENBQUNOO2dCQUM1Qjs7WUFFQSwyQkFBMkI7WUFDM0JSO1lBRUEsdURBQXVEO1lBQ3ZELE1BQU1lO3lDQUFVLElBQU1mOztZQUV0QmdCLE9BQU9DLGdCQUFnQixDQUFDLDBCQUEwQkY7WUFFbEQsVUFBVTtZQUNWO2lDQUFPLElBQ0xDLE9BQU9FLG1CQUFtQixDQUFDLDBCQUEwQkg7O1FBQ3pEO3dCQUFHLEVBQUU7SUFFTCxJQUFJcEIsYUFBYTtRQUNmLHFCQUNFLDhEQUFDUCxrRUFBY0E7c0JBQ2IsNEVBQUNJO2dCQUFXLEdBQUdDLFNBQVM7Ozs7Ozs7Ozs7O0lBRzlCO0lBRUEscUJBQU8sOERBQUNEO1FBQVcsR0FBR0MsU0FBUzs7Ozs7O0FBQ2pDIiwic291cmNlcyI6WyIvVXNlcnMvYnJ1bm9yaWJlaXJvL0RvY3VtZW50cy9mbG93ZGVzay9zcmMvcGFnZXMvX2FwcC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBBcHBQcm9wcyB9IGZyb20gXCJuZXh0L2FwcFwiO1xuaW1wb3J0IFByb3RlY3RlZFJvdXRlIGZyb20gXCJAL2NvbXBvbmVudHMvUHJvdGVjdGVkUm91dGVcIjtcbmltcG9ydCBcIkAvc3R5bGVzL2dsb2JhbHMuY3NzXCI7XG5pbXBvcnQgeyB1c2VFZmZlY3QgfSBmcm9tIFwicmVhY3RcIjtcblxuY29uc3QgUFJPVEVDVEVEX1JPVVRFUyA9IFtcIi9kYXNoYm9hcmRcIl07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFwcCh7IENvbXBvbmVudCwgcGFnZVByb3BzLCByb3V0ZXIgfTogQXBwUHJvcHMpIHtcbiAgY29uc3QgaXNQcm90ZWN0ZWQgPSBQUk9URUNURURfUk9VVEVTLnNvbWUoKHBhdGgpID0+XG4gICAgcm91dGVyLnBhdGhuYW1lLnN0YXJ0c1dpdGgocGF0aClcbiAgKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm47XG5cbiAgICBjb25zdCBsb2FkVGhlbWUgPSAoKSA9PiB7XG4gICAgICAvLyBub21lIGNvcnJldG8gZG8gdGVtYSBwYWRyw6NvOlxuICAgICAgY29uc3Qgc2VsZWN0ZWRUaGVtZSA9XG4gICAgICAgIGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiZmxvd2Rlc2tfdGhlbWVcIikgfHwgXCJkZWZhdWx0XCI7XG5cbiAgICAgIC8vIHJlbW92ZSB0ZW1hIGFudGlnb1xuICAgICAgY29uc3Qgb2xkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJmbG93ZGVzay10aGVtZVwiKTtcbiAgICAgIGlmIChvbGQpIG9sZC5yZW1vdmUoKTtcblxuICAgICAgLy8gY3JpYSBub3ZvIDxsaW5rPlxuICAgICAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaW5rXCIpO1xuICAgICAgbGluay5yZWwgPSBcInN0eWxlc2hlZXRcIjtcbiAgICAgIGxpbmsuaWQgPSBcImZsb3dkZXNrLXRoZW1lXCI7XG5cbiAgICAgIGxpbmsuaHJlZiA9IGAvc3R5bGVzL3RoZW1lcy8ke3NlbGVjdGVkVGhlbWV9LmNzc2A7XG5cbiAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQobGluayk7XG4gICAgfTtcblxuICAgIC8vIGNhcnJlZ2FyIHRlbWEgYW8gaW5pY2lhclxuICAgIGxvYWRUaGVtZSgpO1xuXG4gICAgLy8gcmVjYXJyZWdhciB0ZW1hIHNlbXByZSBxdWUgbyBzZWxldG9yIGVtaXRpciBvIGV2ZW50b1xuICAgIGNvbnN0IGhhbmRsZXIgPSAoKSA9PiBsb2FkVGhlbWUoKTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiZmxvd2Rlc2s6dGhlbWUtdXBkYXRlZFwiLCBoYW5kbGVyKTtcblxuICAgIC8vIGxpbXBlemFcbiAgICByZXR1cm4gKCkgPT5cbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwiZmxvd2Rlc2s6dGhlbWUtdXBkYXRlZFwiLCBoYW5kbGVyKTtcbiAgfSwgW10pO1xuXG4gIGlmIChpc1Byb3RlY3RlZCkge1xuICAgIHJldHVybiAoXG4gICAgICA8UHJvdGVjdGVkUm91dGU+XG4gICAgICAgIDxDb21wb25lbnQgey4uLnBhZ2VQcm9wc30gLz5cbiAgICAgIDwvUHJvdGVjdGVkUm91dGU+XG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiA8Q29tcG9uZW50IHsuLi5wYWdlUHJvcHN9IC8+O1xufSJdLCJuYW1lcyI6WyJQcm90ZWN0ZWRSb3V0ZSIsInVzZUVmZmVjdCIsIlBST1RFQ1RFRF9ST1VURVMiLCJBcHAiLCJDb21wb25lbnQiLCJwYWdlUHJvcHMiLCJyb3V0ZXIiLCJpc1Byb3RlY3RlZCIsInNvbWUiLCJwYXRoIiwicGF0aG5hbWUiLCJzdGFydHNXaXRoIiwibG9hZFRoZW1lIiwic2VsZWN0ZWRUaGVtZSIsImxvY2FsU3RvcmFnZSIsImdldEl0ZW0iLCJvbGQiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwicmVtb3ZlIiwibGluayIsImNyZWF0ZUVsZW1lbnQiLCJyZWwiLCJpZCIsImhyZWYiLCJoZWFkIiwiYXBwZW5kQ2hpbGQiLCJoYW5kbGVyIiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlbW92ZUV2ZW50TGlzdGVuZXIiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/pages/_app.tsx\n");

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