/**
 * WeakRef polyfill for Hermes (React Native).
 * react-native-purchases requires WeakRef but Hermes doesn't enable it by default.
 * This must run before any other code.
 */
(function (global) {
  if (typeof global === 'object' && global && typeof global.WeakRef === 'undefined') {
    global.WeakRef = (function (wm) {
      function WeakRef(target) {
        wm.set(this, target);
      }
      WeakRef.prototype.deref = function () {
        return wm.get(this);
      };
      return WeakRef;
    })(new WeakMap());
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
