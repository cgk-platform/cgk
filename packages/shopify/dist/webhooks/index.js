import {
  createAdminClient
} from "../chunk-W4RFSGMI.js";
import "../chunk-H4N422JF.js";
import {
  __commonJS,
  __export,
  __toESM
} from "../chunk-4VNS5WPM.js";

// ../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/path/query-result.js
var require_query_result = __commonJS({
  "../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/path/query-result.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var QueryResult = (
      /** @class */
      (function() {
        function QueryResult2(depth, path, object) {
          this.depth = 0;
          this.depth = depth;
          this.path = path;
          this.object = object;
        }
        QueryResult2.prototype.flatten = function() {
          var flattenedObject = this.object;
          if (typeof this.object === "object" && Array.isArray(this.object) && this.depth > 0) {
            flattenedObject = this.object.flat(this.depth);
          }
          return new QueryResult2(0, this.path, flattenedObject);
        };
        return QueryResult2;
      })()
    );
    exports.default = QueryResult;
  }
});

// ../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/path/simple-key-path-component.js
var require_simple_key_path_component = __commonJS({
  "../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/path/simple-key-path-component.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SimpleKeyPathComponent = void 0;
    var query_result_1 = require_query_result();
    var SimpleKeyPathComponent = (
      /** @class */
      (function() {
        function SimpleKeyPathComponent2(keyName) {
          this.isArray = false;
          this.keyName = keyName;
          var keyAsInteger = parseInt(this.keyName, 10);
          if (isNaN(keyAsInteger)) {
            return;
          }
          var isInteger = Number.isInteger(keyAsInteger);
          if (!isInteger) {
            return;
          }
          if (keyAsInteger < 0) {
            return;
          }
          this.isArray = true;
        }
        SimpleKeyPathComponent2.fromString = function(string) {
          var keyName = string;
          SimpleKeyPathComponent2.unescapeExpressions.forEach(function(unescapePair) {
            keyName = keyName.replace(unescapePair.search, unescapePair.replacement);
          });
          return new SimpleKeyPathComponent2(keyName);
        };
        SimpleKeyPathComponent2.prototype.toString = function() {
          var escapedString = this.keyName;
          SimpleKeyPathComponent2.escapeExpressions.forEach(function(escapePair) {
            escapedString = escapedString.replace(escapePair.search, escapePair.replacement);
          });
          return escapedString;
        };
        SimpleKeyPathComponent2.prototype.jsonPointer = function() {
          var escapedString = this.keyName;
          escapedString = escapedString.replace(/(\~)/g, "~0");
          escapedString = escapedString.replace(/(\/)/g, "~1");
          return escapedString;
        };
        SimpleKeyPathComponent2.prototype.query = function(results) {
          var newResults = [];
          for (var i2 = 0; i2 < results.length; i2++) {
            var result = results[i2];
            var object = result.object;
            if (typeof object !== "object") {
              continue;
            }
            var newObject = object[this.keyName];
            if (newObject === null) {
              continue;
            }
            var newResult = new query_result_1.default(result.depth, result.path.child(this.keyName), newObject);
            newResults.push(newResult);
          }
          return newResults;
        };
        SimpleKeyPathComponent2.escapeExpressions = [
          { search: new RegExp(/(\\)/g), replacement: "\\" },
          { search: new RegExp(/(\.)/g), replacement: "\\." }
        ];
        SimpleKeyPathComponent2.unescapeExpressions = [
          { search: new RegExp(/(\\\.)/g), replacement: "." },
          { search: new RegExp(/(\\\\)/g), replacement: "\\" },
          { search: "~1", replacement: "/" }
        ];
        return SimpleKeyPathComponent2;
      })()
    );
    exports.SimpleKeyPathComponent = SimpleKeyPathComponent;
  }
});

// ../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/path/wildcard-path-component.js
var require_wildcard_path_component = __commonJS({
  "../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/path/wildcard-path-component.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WildcardPathComponent = void 0;
    var query_result_1 = require_query_result();
    var WildcardPathComponent = (
      /** @class */
      (function() {
        function WildcardPathComponent2() {
          this.keyName = "*";
          this.isArray = true;
        }
        WildcardPathComponent2.fromString = function(string) {
          if (string === "*") {
            return new WildcardPathComponent2();
          }
          return null;
        };
        WildcardPathComponent2.prototype.toString = function() {
          return this.keyName;
        };
        WildcardPathComponent2.prototype.jsonPointer = function() {
          throw Error("JSON Pointers don't work with wildcards");
        };
        WildcardPathComponent2.prototype.query = function(results) {
          var newResults = [];
          for (var i2 = 0; i2 < results.length; i2++) {
            var result = results[i2];
            var object = result.object;
            if (typeof object !== "object") {
              continue;
            }
            for (var key in object) {
              var newObject = object[key];
              var newResult = new query_result_1.default(result.depth + 1, result.path.child(key), newObject);
              newResults.push(newResult);
            }
          }
          return newResults;
        };
        return WildcardPathComponent2;
      })()
    );
    exports.WildcardPathComponent = WildcardPathComponent;
  }
});

// ../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/path/start-path-component.js
var require_start_path_component = __commonJS({
  "../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/path/start-path-component.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var StartPathComponent = (
      /** @class */
      (function() {
        function StartPathComponent2() {
          this.keyName = "$";
          this.isArray = false;
        }
        StartPathComponent2.fromString = function(string) {
          if (string === "$") {
            return new StartPathComponent2();
          }
          return null;
        };
        StartPathComponent2.prototype.toString = function() {
          return this.keyName;
        };
        StartPathComponent2.prototype.jsonPointer = function() {
          return "";
        };
        StartPathComponent2.prototype.query = function(objects) {
          return objects;
        };
        return StartPathComponent2;
      })()
    );
    exports.default = StartPathComponent;
  }
});

// ../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/path/slice-path-component.js
var require_slice_path_component = __commonJS({
  "../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/path/slice-path-component.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SlicePathComponent = void 0;
    var query_result_1 = require_query_result();
    var SlicePathComponent = (
      /** @class */
      (function() {
        function SlicePathComponent2(startIndex, endIndex) {
          this.endIndex = null;
          this.isArray = true;
          this.startIndex = startIndex;
          this.endIndex = endIndex;
        }
        SlicePathComponent2.fromString = function(string) {
          if (!SlicePathComponent2.regex.test(string)) {
            return null;
          }
          SlicePathComponent2.regex.lastIndex = 0;
          var result = SlicePathComponent2.regex.exec(string);
          if (result == null || result.groups == null) {
            return null;
          }
          var startResult = result.groups.startIndex;
          var endResult = result.groups.endIndex;
          var startIndex = startResult == null || startResult === "" ? 0 : parseInt(startResult, 10);
          var endIndex = endResult == null ? null : parseInt(endResult, 10);
          if (startIndex == null && endIndex == null) {
            return null;
          }
          var isStartInteger = Number.isInteger(startIndex);
          if (!isStartInteger) {
            return null;
          }
          return new SlicePathComponent2(startIndex, endIndex);
        };
        SlicePathComponent2.prototype.toString = function() {
          return "[".concat(this.startIndex).concat(this.endIndex == null ? "" : ":" + this.endIndex, "]");
        };
        SlicePathComponent2.prototype.jsonPointer = function() {
          throw Error("JSON Pointers don't work with wildcards");
        };
        SlicePathComponent2.prototype.query = function(results) {
          var newResults = [];
          for (var i2 = 0; i2 < results.length; i2++) {
            var result = results[i2];
            var object = result.object;
            if (typeof object !== "object")
              continue;
            if (!Array.isArray(object))
              continue;
            var slicedItems = void 0;
            if (this.endIndex == null) {
              slicedItems = object.slice(this.startIndex);
            } else {
              slicedItems = object.slice(this.startIndex, this.endIndex);
            }
            for (var j = 0; j < slicedItems.length; j++) {
              var slicedItem = slicedItems[j];
              newResults.push(new query_result_1.default(result.depth + 1, result.path.child("".concat(j + this.startIndex)), slicedItem));
            }
          }
          return newResults;
        };
        SlicePathComponent2.regex = /^\[(?<startIndex>[0-9]*):(?<endIndex>\-?[0-9]*)?\]$/g;
        return SlicePathComponent2;
      })()
    );
    exports.SlicePathComponent = SlicePathComponent;
  }
});

// ../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/path/path-builder.js
var require_path_builder = __commonJS({
  "../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/path/path-builder.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var simple_key_path_component_1 = require_simple_key_path_component();
    var wildcard_path_component_1 = require_wildcard_path_component();
    var start_path_component_1 = require_start_path_component();
    var slice_path_component_1 = require_slice_path_component();
    var PathBuilder = (
      /** @class */
      (function() {
        function PathBuilder2() {
        }
        PathBuilder2.prototype.parse = function(path) {
          PathBuilder2.pathPattern.lastIndex = 0;
          var subPaths = path.match(PathBuilder2.pathPattern);
          var components = [new start_path_component_1.default()];
          if (subPaths == null || subPaths.length == 0 || subPaths.length == 1 && subPaths[0] == "") {
            return components;
          }
          var startIndex = 0;
          if (subPaths[0] == "$") {
            startIndex = 1;
          }
          for (var i2 = startIndex; i2 < subPaths.length; i2++) {
            var subPath = subPaths[i2];
            var pathComponent = this.parseComponent(subPath);
            components.push(pathComponent);
          }
          return components;
        };
        PathBuilder2.prototype.parsePointer = function(pointer) {
          PathBuilder2.pathPattern.lastIndex = 0;
          var subPaths = pointer.match(PathBuilder2.pointerPattern);
          var components = [new start_path_component_1.default()];
          if (subPaths == null || subPaths.length == 0 || subPaths.length == 1 && subPaths[0] == "") {
            return components;
          }
          for (var _i = 0, subPaths_1 = subPaths; _i < subPaths_1.length; _i++) {
            var subPath = subPaths_1[_i];
            components.push(this.parseComponent(subPath));
          }
          return components;
        };
        PathBuilder2.prototype.parseComponent = function(string) {
          var wildcardComponent = wildcard_path_component_1.WildcardPathComponent.fromString(string);
          if (wildcardComponent != null) {
            return wildcardComponent;
          }
          if (string == null) {
            throw new SyntaxError("Cannot create a path from null");
          }
          if (string == "") {
            throw new SyntaxError("Cannot create a path from an empty string");
          }
          var sliceComponent = slice_path_component_1.SlicePathComponent.fromString(string);
          if (sliceComponent != null) {
            return sliceComponent;
          }
          return simple_key_path_component_1.SimpleKeyPathComponent.fromString(string);
        };
        PathBuilder2.pathPattern = /(?:[^\.\\]|\\.)+/g;
        PathBuilder2.pointerPattern = /(?:[^\/\\]|\\\/)+/g;
        return PathBuilder2;
      })()
    );
    exports.default = PathBuilder;
  }
});

// ../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/index.js
var require_lib = __commonJS({
  "../../node_modules/.pnpm/@jsonhero+path@1.0.21/node_modules/@jsonhero/path/lib/index.js"(exports) {
    "use strict";
    var __spreadArray5 = exports && exports.__spreadArray || function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
        if (ar || !(i2 in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
          ar[i2] = from[i2];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.JSONHeroPath = void 0;
    var path_builder_1 = require_path_builder();
    var query_result_1 = require_query_result();
    var start_path_component_1 = require_start_path_component();
    var JSONHeroPath3 = (
      /** @class */
      (function() {
        function JSONHeroPath4(components) {
          if (typeof components == "string") {
            var pathBuilder = new path_builder_1.default();
            this.components = pathBuilder.parse(components);
            return;
          }
          if (components.length == 0) {
            components.push(new start_path_component_1.default());
          }
          if (!(components[0] instanceof start_path_component_1.default)) {
            components.unshift(new start_path_component_1.default());
          }
          this.components = components;
        }
        JSONHeroPath4.fromPointer = function(pointer) {
          var pathBuilder = new path_builder_1.default();
          return new JSONHeroPath4(pathBuilder.parsePointer(pointer));
        };
        Object.defineProperty(JSONHeroPath4.prototype, "root", {
          get: function() {
            return new JSONHeroPath4(this.components.slice(0, 1));
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(JSONHeroPath4.prototype, "isRoot", {
          get: function() {
            if (this.components.length > 1)
              return false;
            return this.components[0] instanceof start_path_component_1.default;
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(JSONHeroPath4.prototype, "parent", {
          get: function() {
            if (this.components.length == 1) {
              return null;
            }
            return new JSONHeroPath4(this.components.slice(0, -1));
          },
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(JSONHeroPath4.prototype, "lastComponent", {
          get: function() {
            if (this.components.length === 0)
              return;
            return this.components[this.components.length - 1];
          },
          enumerable: false,
          configurable: true
        });
        JSONHeroPath4.prototype.child = function(key) {
          var string = this.toString();
          return new JSONHeroPath4(string.concat(".".concat(key)));
        };
        JSONHeroPath4.prototype.replaceComponent = function(index, newKey) {
          var pathBuilder = new path_builder_1.default();
          var newComponent = pathBuilder.parseComponent(newKey);
          var newComponents = __spreadArray5([], this.components, true);
          newComponents[index] = newComponent;
          return new JSONHeroPath4(newComponents);
        };
        JSONHeroPath4.prototype.toString = function() {
          return this.components.map(function(component) {
            return component.toString();
          }).join(".");
        };
        JSONHeroPath4.prototype.jsonPointer = function() {
          if (this.components.length === 1)
            return "";
          return this.components.map(function(component) {
            return component.jsonPointer();
          }).join("/");
        };
        JSONHeroPath4.prototype.first = function(object, options) {
          if (options === void 0) {
            options = { includePath: false };
          }
          var results = this.all(object, options);
          if (results === null || results.length === 0) {
            return null;
          }
          return results[0];
        };
        JSONHeroPath4.prototype.all = function(object, options) {
          if (options === void 0) {
            options = { includePath: false };
          }
          if (this.components.length == 0)
            return [object];
          if (this.components.length == 1 && this.components[0] instanceof start_path_component_1.default)
            return [object];
          var results = [];
          var firstResult = new query_result_1.default(0, this.root, object);
          results.push(firstResult);
          for (var i2 = 0; i2 < this.components.length; i2++) {
            var component = this.components[i2];
            results = component.query(results);
            if (results === null || results.length === 0) {
              return [];
            }
          }
          var flattenedResults = results.map(function(result) {
            return result.flatten();
          });
          if (!options.includePath) {
            return flattenedResults.map(function(result) {
              return result.object;
            });
          }
          var all = [];
          for (var i2 = 0; i2 < flattenedResults.length; i2++) {
            var flattenedResult = flattenedResults[i2];
            var object_1 = {
              value: flattenedResult.object
            };
            if (options.includePath) {
              object_1.path = flattenedResult.path;
            }
            all.push(object_1);
          }
          return all;
        };
        JSONHeroPath4.prototype.set = function(object, newValue) {
          var allResults = this.all(object, { includePath: true });
          allResults.forEach(function(_a) {
            var path = _a.path;
            var parentPath = path.parent;
            var parentObject = parentPath === null || parentPath === void 0 ? void 0 : parentPath.first(object);
            if (!path.lastComponent)
              return;
            parentObject[path.lastComponent.toString()] = newValue;
          });
        };
        JSONHeroPath4.prototype.merge = function(object, mergeValue) {
          var allResults = this.all(object, { includePath: true });
          allResults.forEach(function(_a) {
            var path = _a.path;
            var parentPath = path.parent;
            var parentObject = parentPath === null || parentPath === void 0 ? void 0 : parentPath.first(object);
            if (!path.lastComponent)
              return;
            var existingValue = parentObject[path.lastComponent.toString()];
            if (Array.isArray(existingValue)) {
              parentObject[path.lastComponent.toString()] = existingValue.concat([mergeValue].flat());
            } else {
              if (typeof mergeValue != "object" || Array.isArray(mergeValue))
                return;
              for (var key in mergeValue) {
                existingValue[key] = mergeValue[key];
              }
            }
          });
        };
        return JSONHeroPath4;
      })()
    );
    exports.JSONHeroPath = JSONHeroPath3;
  }
});

// ../../node_modules/.pnpm/@google-cloud+precise-date@4.0.0/node_modules/@google-cloud/precise-date/build/src/index.js
var require_src = __commonJS({
  "../../node_modules/.pnpm/@google-cloud+precise-date@4.0.0/node_modules/@google-cloud/precise-date/build/src/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PreciseDate = void 0;
    var FULL_ISO_REG = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d{4,9}Z/;
    var NO_BIG_INT = "BigInt only available in Node >= v10.7. Consider using getFullTimeString instead.";
    var Sign;
    (function(Sign2) {
      Sign2[Sign2["NEGATIVE"] = -1] = "NEGATIVE";
      Sign2[Sign2["POSITIVE"] = 1] = "POSITIVE";
      Sign2[Sign2["ZERO"] = 0] = "ZERO";
    })(Sign || (Sign = {}));
    var PreciseDate2 = class _PreciseDate extends Date {
      constructor(time) {
        super();
        this._micros = 0;
        this._nanos = 0;
        if (time && typeof time !== "number" && !(time instanceof Date)) {
          this.setFullTime(_PreciseDate.parseFull(time));
          return;
        }
        const args = Array.from(arguments);
        const dateFields = args.slice(0, 7);
        const date = new Date(...dateFields);
        const nanos = args.length === 9 ? args.pop() : 0;
        const micros = args.length === 8 ? args.pop() : 0;
        this.setTime(date.getTime());
        this.setMicroseconds(micros);
        this.setNanoseconds(nanos);
      }
      /**
       * Returns the specified date represented in nanoseconds according to
       * universal time.
       *
       * **NOTE:** Because this method returns a `BigInt` it requires Node >= v10.7.
       * Use {@link PreciseDate#getFullTimeString} to get the time as a string.
       *
       * @see {@link https://github.com/tc39/proposal-bigint|BigInt}
       *
       * @throws {error} If `BigInt` is unavailable.
       * @returns {bigint}
       *
       * @example
       * const date = new PreciseDate('2019-02-08T10:34:29.481145231Z');
       *
       * console.log(date.getFullTime());
       * // expected output: 1549622069481145231n
       */
      getFullTime() {
        if (typeof BigInt !== "function") {
          throw new Error(NO_BIG_INT);
        }
        return BigInt(this.getFullTimeString());
      }
      /**
       * Returns a string of the specified date represented in nanoseconds according
       * to universal time.
       *
       * @returns {string}
       *
       * @example
       * const date = new PreciseDate('2019-02-08T10:34:29.481145231Z');
       *
       * console.log(date.getFullTimeString());
       * // expected output: "1549622069481145231"
       */
      getFullTimeString() {
        const seconds = this._getSeconds();
        let nanos = this._getNanos();
        if (nanos && Math.sign(seconds) === Sign.NEGATIVE) {
          nanos = 1e9 - nanos;
        }
        return `${seconds}${padLeft(nanos, 9)}`;
      }
      /**
       * Returns the microseconds in the specified date according to universal time.
       *
       * @returns {number}
       *
       * @example
       * const date = new PreciseDate('2019-02-08T10:34:29.481145Z');
       *
       * console.log(date.getMicroseconds());
       * // expected output: 145
       */
      getMicroseconds() {
        return this._micros;
      }
      /**
       * Returns the nanoseconds in the specified date according to universal time.
       *
       * @returns {number}
       *
       * @example
       * const date = new PreciseDate('2019-02-08T10:34:29.481145231Z');
       *
       * console.log(date.getNanoseconds());
       * // expected output: 231
       */
      getNanoseconds() {
        return this._nanos;
      }
      /**
       * Sets the microseconds for a specified date according to universal time.
       *
       * @param {number} microseconds A number representing the microseconds.
       * @returns {string} Returns a string representing the nanoseconds in the
       *     specified date according to universal time.
       *
       * @example
       * const date = new PreciseDate();
       *
       * date.setMicroseconds(149);
       *
       * console.log(date.getMicroseconds());
       * // expected output: 149
       */
      setMicroseconds(micros) {
        const abs = Math.abs(micros);
        let millis = this.getUTCMilliseconds();
        if (abs >= 1e3) {
          millis += Math.floor(abs / 1e3) * Math.sign(micros);
          micros %= 1e3;
        }
        if (Math.sign(micros) === Sign.NEGATIVE) {
          millis -= 1;
          micros += 1e3;
        }
        this._micros = micros;
        this.setUTCMilliseconds(millis);
        return this.getFullTimeString();
      }
      /**
       * Sets the nanoseconds for a specified date according to universal time.
       *
       * @param {number} nanoseconds A number representing the nanoseconds.
       * @returns {string} Returns a string representing the nanoseconds in the
       *     specified date according to universal time.
       *
       * @example
       * const date = new PreciseDate();
       *
       * date.setNanoseconds(231);
       *
       * console.log(date.getNanoseconds());
       * // expected output: 231
       */
      setNanoseconds(nanos) {
        const abs = Math.abs(nanos);
        let micros = this._micros;
        if (abs >= 1e3) {
          micros += Math.floor(abs / 1e3) * Math.sign(nanos);
          nanos %= 1e3;
        }
        if (Math.sign(nanos) === Sign.NEGATIVE) {
          micros -= 1;
          nanos += 1e3;
        }
        this._nanos = nanos;
        return this.setMicroseconds(micros);
      }
      /**
       * Sets the PreciseDate object to the time represented by a number of
       * nanoseconds since January 1, 1970, 00:00:00 UTC.
       *
       * @param {bigint|number|string} time Value representing the number of
       *     nanoseconds since January 1, 1970, 00:00:00 UTC.
       * @returns {string} Returns a string representing the nanoseconds in the
       *     specified date according to universal time (effectively, the value of
       *     the argument).
       *
       * @see {@link https://github.com/tc39/proposal-bigint|BigInt}
       *
       * @example <caption>With a nanosecond string.</caption>
       * const date = new PreciseDate();
       * date.setFullTime('1549622069481145231');
       *
       * @example <caption>With a BigInt</caption>
       * date.setFullTime(1549622069481145231n);
       */
      setFullTime(time) {
        if (typeof time !== "string") {
          time = time.toString();
        }
        const sign = Math.sign(Number(time));
        time = time.replace(/^-/, "");
        const seconds = Number(time.substr(0, time.length - 9)) * sign;
        const nanos = Number(time.substr(-9)) * sign;
        this.setTime(seconds * 1e3);
        return this.setNanoseconds(nanos);
      }
      /**
       * Sets the PreciseDate object to the time represented by a number of
       * milliseconds since January 1, 1970, 00:00:00 UTC. Calling this method will
       * reset both the microseconds and nanoseconds to 0.
       *
       * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/setTime|Date#setTime}
       *
       * @param {number} time Value representing the number of milliseconds since
       *     January 1, 1970, 00:00:00 UTC.
       * @returns {string} The number of milliseconds between January 1, 1970,
       *     00:00:00 UTC and the updated date (effectively, the value of the
       *     argument).
       */
      setTime(time) {
        this._micros = 0;
        this._nanos = 0;
        return super.setTime(time);
      }
      /**
       * Returns a string in RFC 3339 format. Unlike the native `Date#toISOString`,
       * this will return 9 digits to represent sub-second precision.
       *
       * @see {@link https://tools.ietf.org/html/rfc3339|RFC 3339}
       *
       * @returns {string}
       *
       * @example
       * const date = new PreciseDate(1549622069481145231n);
       *
       * console.log(date.toISOString());
       * // expected output: "2019-02-08T10:34:29.481145231Z"
       */
      toISOString() {
        const micros = padLeft(this._micros, 3);
        const nanos = padLeft(this._nanos, 3);
        return super.toISOString().replace(/z$/i, `${micros}${nanos}Z`);
      }
      /**
       * Returns an object representing the specified date according to universal
       * time.
       *
       * @see {@link https://developers.google.com/protocol-buffers/docs/reference/google.protobuf#timestamp|google.protobuf.Timestamp}
       *
       * @returns {DateStruct}
       *
       * @example
       * const date = new PreciseDate('2019-02-08T10:34:29.481145231Z');
       *
       * console.log(date.toStruct());
       * // expected output: {seconds: 1549622069, nanos: 481145231}
       */
      toStruct() {
        let seconds = this._getSeconds();
        const nanos = this._getNanos();
        const sign = Math.sign(seconds);
        if (sign === Sign.NEGATIVE && nanos) {
          seconds -= 1;
        }
        return { seconds, nanos };
      }
      /**
       * Returns a tuple representing the specified date according to universal
       * time.
       *
       * @returns {DateTuple}
       *
       * @example
       * const date = new PreciseDate('2019-02-08T10:34:29.481145231Z');
       *
       * console.log(date.toTuple());
       * // expected output: [1549622069, 481145231]
       */
      toTuple() {
        const { seconds, nanos } = this.toStruct();
        return [seconds, nanos];
      }
      /**
       * Returns the total number of seconds in the specified date since Unix epoch.
       * Numbers representing < epoch will be negative.
       *
       * @private
       *
       * @returns {number}
       */
      _getSeconds() {
        const time = this.getTime();
        const sign = Math.sign(time);
        return Math.floor(Math.abs(time) / 1e3) * sign;
      }
      /**
       * Returns the sub-second precision of the specified date. This will always be
       * a positive number.
       *
       * @private
       *
       * @returns {number}
       */
      _getNanos() {
        const msInNanos = this.getUTCMilliseconds() * 1e6;
        const microsInNanos = this._micros * 1e3;
        return this._nanos + msInNanos + microsInNanos;
      }
      /**
       * Parses a precise time.
       *
       * @static
       *
       * @param {string|bigint|DateTuple|DateStruct} time The precise time value.
       * @returns {string} Returns a string representing the nanoseconds in the
       *     specified date according to universal time.
       *
       * @example <caption>From a RFC 3339 formatted string.</caption>
       * const time = PreciseDate.parseFull('2019-02-08T10:34:29.481145231Z');
       * console.log(time); // expected output: "1549622069481145231"
       *
       * @example <caption>From a nanosecond timestamp string.</caption>
       * const time = PreciseDate.parseFull('1549622069481145231');
       * console.log(time); // expected output: "1549622069481145231"
       *
       * @example <caption>From a BigInt (requires Node >= v10.7)</caption>
       * const time = PreciseDate.parseFull(1549622069481145231n);
       * console.log(time); // expected output: "1549622069481145231"
       *
       * @example <caption>From a tuple.</caption>
       * const time = PreciseDate.parseFull([1549622069, 481145231]);
       * console.log(time); // expected output: "1549622069481145231"
       *
       * @example <caption>From an object.</caption>
       * const struct = {seconds: 1549622069, nanos: 481145231};
       * const time = PreciseDate.parseFull(struct);
       * console.log(time); // expected output: "1549622069481145231"
       */
      static parseFull(time) {
        const date = new _PreciseDate();
        if (Array.isArray(time)) {
          const [seconds, nanos] = time;
          time = { seconds, nanos };
        }
        if (isFullTime(time)) {
          date.setFullTime(time);
        } else if (isStruct(time)) {
          const { seconds, nanos } = parseProto(time);
          date.setTime(seconds * 1e3);
          date.setNanoseconds(nanos);
        } else if (isFullISOString(time)) {
          date.setFullTime(parseFullISO(time));
        } else {
          date.setTime(new Date(time).getTime());
        }
        return date.getFullTimeString();
      }
      /**
       * Accepts the same number parameters as the PreciseDate constructor, but
       * treats them as UTC. It returns a string that represents the number of
       * nanoseconds since January 1, 1970, 00:00:00 UTC.
       *
       * **NOTE:** Because this method returns a `BigInt` it requires Node >= v10.7.
       *
       * @see {@link https://github.com/tc39/proposal-bigint|BigInt}
       *
       * @static
       *
       * @throws {error} If `BigInt` is unavailable.
       *
       * @param {...number} [dateFields] The date fields.
       * @returns {bigint}
       *
       * @example
       * const time = PreciseDate.fullUTC(2019, 1, 8, 10, 34, 29, 481, 145, 231);
       * console.log(time); // expected output: 1549622069481145231n
       */
      static fullUTC(...args) {
        if (typeof BigInt !== "function") {
          throw new Error(NO_BIG_INT);
        }
        return BigInt(_PreciseDate.fullUTCString(...args));
      }
      /**
       * Accepts the same number parameters as the PreciseDate constructor, but
       * treats them as UTC. It returns a string that represents the number of
       * nanoseconds since January 1, 1970, 00:00:00 UTC.
       *
       * @static
       *
       * @param {...number} [dateFields] The date fields.
       * @returns {string}
       *
       * @example
       * const time = PreciseDate.fullUTCString(2019, 1, 8, 10, 34, 29, 481, 145,
       * 231); console.log(time); // expected output: '1549622069481145231'
       */
      static fullUTCString(...args) {
        const milliseconds = Date.UTC(...args.slice(0, 7));
        const date = new _PreciseDate(milliseconds);
        if (args.length === 9) {
          date.setNanoseconds(args.pop());
        }
        if (args.length === 8) {
          date.setMicroseconds(args.pop());
        }
        return date.getFullTimeString();
      }
    };
    exports.PreciseDate = PreciseDate2;
    function parseFullISO(time) {
      let digits = "0";
      time = time.replace(/\.(\d+)/, ($0, $1) => {
        digits = $1;
        return ".000";
      });
      const nanos = Number(padRight(digits, 9));
      const date = new PreciseDate2(time);
      return date.setNanoseconds(nanos);
    }
    function parseProto({ seconds = 0, nanos = 0 }) {
      if (typeof seconds.toNumber === "function") {
        seconds = seconds.toNumber();
      }
      seconds = Number(seconds);
      nanos = Number(nanos);
      return { seconds, nanos };
    }
    function isFullTime(time) {
      return typeof time === "bigint" || typeof time === "string" && /^\d+$/.test(time);
    }
    function isStruct(time) {
      return typeof time === "object" && typeof time.seconds !== "undefined" || typeof time.nanos === "number";
    }
    function isFullISOString(time) {
      return typeof time === "string" && FULL_ISO_REG.test(time);
    }
    function padLeft(n2, min) {
      const padding = getPadding(n2, min);
      return `${padding}${n2}`;
    }
    function padRight(n2, min) {
      const padding = getPadding(n2, min);
      return `${n2}${padding}`;
    }
    function getPadding(n2, min) {
      const size = Math.max(min - n2.toString().length, 0);
      return "0".repeat(size);
    }
  }
});

// ../../node_modules/.pnpm/humanize-duration@3.33.2/node_modules/humanize-duration/humanize-duration.js
var require_humanize_duration = __commonJS({
  "../../node_modules/.pnpm/humanize-duration@3.33.2/node_modules/humanize-duration/humanize-duration.js"(exports, module) {
    "use strict";
    (function() {
      var assign = Object.assign || /** @param {...any} destination */
      function(destination) {
        var source;
        for (var i2 = 1; i2 < arguments.length; i2++) {
          source = arguments[i2];
          for (var prop in source) {
            if (has(source, prop)) {
              destination[prop] = source[prop];
            }
          }
        }
        return destination;
      };
      var isArray3 = Array.isArray || function(arg) {
        return Object.prototype.toString.call(arg) === "[object Array]";
      };
      var GREEK = onesLanguage(
        ["\u03C7\u03C1\u03CC\u03BD\u03BF\u03C2", "\u03C7\u03C1\u03CC\u03BD\u03B9\u03B1"],
        ["\u03BC\u03AE\u03BD\u03B1\u03C2", "\u03BC\u03AE\u03BD\u03B5\u03C2"],
        ["\u03B5\u03B2\u03B4\u03BF\u03BC\u03AC\u03B4\u03B1", "\u03B5\u03B2\u03B4\u03BF\u03BC\u03AC\u03B4\u03B5\u03C2"],
        ["\u03BC\u03AD\u03C1\u03B1", "\u03BC\u03AD\u03C1\u03B5\u03C2"],
        ["\u03CE\u03C1\u03B1", "\u03CE\u03C1\u03B5\u03C2"],
        ["\u03BB\u03B5\u03C0\u03C4\u03CC", "\u03BB\u03B5\u03C0\u03C4\u03AC"],
        ["\u03B4\u03B5\u03C5\u03C4\u03B5\u03C1\u03CC\u03BB\u03B5\u03C0\u03C4\u03BF", "\u03B4\u03B5\u03C5\u03C4\u03B5\u03C1\u03CC\u03BB\u03B5\u03C0\u03C4\u03B1"],
        ["\u03C7\u03B9\u03BB\u03B9\u03BF\u03C3\u03C4\u03CC \u03C4\u03BF\u03C5 \u03B4\u03B5\u03C5\u03C4\u03B5\u03C1\u03BF\u03BB\u03AD\u03C0\u03C4\u03BF\u03C5", "\u03C7\u03B9\u03BB\u03B9\u03BF\u03C3\u03C4\u03AC \u03C4\u03BF\u03C5 \u03B4\u03B5\u03C5\u03C4\u03B5\u03C1\u03BF\u03BB\u03AD\u03C0\u03C4\u03BF\u03C5"],
        ","
      );
      var LANGUAGES = {
        af: onesLanguage(
          ["jaar", "jaar"],
          ["maand", "maande"],
          ["week", "weke"],
          ["dag", "dae"],
          ["uur", "ure"],
          ["minuut", "minute"],
          ["sekonde", "sekondes"],
          ["millisekonde", "millisekondes"],
          ","
        ),
        am: language("\u12D3\u1218\u1275", "\u12C8\u122D", "\u1233\u121D\u1295\u1275", "\u1240\u1295", "\u1230\u12D3\u1275", "\u12F0\u1242\u1243", "\u1230\u12A8\u1295\u12F5", "\u121A\u120A\u1230\u12A8\u1295\u12F5"),
        ar: assign(
          language(
            function(c2) {
              return ["\u0633\u0646\u0629", "\u0633\u0646\u062A\u0627\u0646", "\u0633\u0646\u0648\u0627\u062A"][getArabicForm(c2)];
            },
            function(c2) {
              return ["\u0634\u0647\u0631", "\u0634\u0647\u0631\u0627\u0646", "\u0623\u0634\u0647\u0631"][getArabicForm(c2)];
            },
            function(c2) {
              return ["\u0623\u0633\u0628\u0648\u0639", "\u0623\u0633\u0628\u0648\u0639\u064A\u0646", "\u0623\u0633\u0627\u0628\u064A\u0639"][getArabicForm(c2)];
            },
            function(c2) {
              return ["\u064A\u0648\u0645", "\u064A\u0648\u0645\u064A\u0646", "\u0623\u064A\u0627\u0645"][getArabicForm(c2)];
            },
            function(c2) {
              return ["\u0633\u0627\u0639\u0629", "\u0633\u0627\u0639\u062A\u064A\u0646", "\u0633\u0627\u0639\u0627\u062A"][getArabicForm(c2)];
            },
            function(c2) {
              return ["\u062F\u0642\u064A\u0642\u0629", "\u062F\u0642\u064A\u0642\u062A\u0627\u0646", "\u062F\u0642\u0627\u0626\u0642"][getArabicForm(c2)];
            },
            function(c2) {
              return ["\u062B\u0627\u0646\u064A\u0629", "\u062B\u0627\u0646\u064A\u062A\u0627\u0646", "\u062B\u0648\u0627\u0646\u064A"][getArabicForm(c2)];
            },
            function(c2) {
              return ["\u062C\u0632\u0621 \u0645\u0646 \u0627\u0644\u062B\u0627\u0646\u064A\u0629", "\u062C\u0632\u0622\u0646 \u0645\u0646 \u0627\u0644\u062B\u0627\u0646\u064A\u0629", "\u0623\u062C\u0632\u0627\u0621 \u0645\u0646 \u0627\u0644\u062B\u0627\u0646\u064A\u0629"][getArabicForm(c2)];
            },
            ","
          ),
          {
            delimiter: " \uFEED ",
            _hideCountIf2: true,
            _digitReplacements: ["\u06F0", "\u0661", "\u0662", "\u0663", "\u0664", "\u0665", "\u0666", "\u0667", "\u0668", "\u0669"]
          }
        ),
        bg: slavicLanguage(
          ["\u0433\u043E\u0434\u0438\u043D\u0438", "\u0433\u043E\u0434\u0438\u043D\u0430", "\u0433\u043E\u0434\u0438\u043D\u0438"],
          ["\u043C\u0435\u0441\u0435\u0446\u0430", "\u043C\u0435\u0441\u0435\u0446", "\u043C\u0435\u0441\u0435\u0446\u0430"],
          ["\u0441\u0435\u0434\u043C\u0438\u0446\u0438", "\u0441\u0435\u0434\u043C\u0438\u0446\u0430", "\u0441\u0435\u0434\u043C\u0438\u0446\u0438"],
          ["\u0434\u043D\u0438", "\u0434\u0435\u043D", "\u0434\u043D\u0438"],
          ["\u0447\u0430\u0441\u0430", "\u0447\u0430\u0441", "\u0447\u0430\u0441\u0430"],
          ["\u043C\u0438\u043D\u0443\u0442\u0438", "\u043C\u0438\u043D\u0443\u0442\u0430", "\u043C\u0438\u043D\u0443\u0442\u0438"],
          ["\u0441\u0435\u043A\u0443\u043D\u0434\u0438", "\u0441\u0435\u043A\u0443\u043D\u0434\u0430", "\u0441\u0435\u043A\u0443\u043D\u0434\u0438"],
          ["\u043C\u0438\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434\u0438", "\u043C\u0438\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434\u0430", "\u043C\u0438\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434\u0438"]
        ),
        bn: language(
          "\u09AC\u099B\u09B0",
          "\u09AE\u09BE\u09B8",
          "\u09B8\u09AA\u09CD\u09A4\u09BE\u09B9",
          "\u09A6\u09BF\u09A8",
          "\u0998\u09A8\u09CD\u099F\u09BE",
          "\u09AE\u09BF\u09A8\u09BF\u099F",
          "\u09B8\u09C7\u0995\u09C7\u09A8\u09CD\u09A1",
          "\u09AE\u09BF\u09B2\u09BF\u09B8\u09C7\u0995\u09C7\u09A8\u09CD\u09A1"
        ),
        ca: onesLanguage(
          ["any", "anys"],
          ["mes", "mesos"],
          ["setmana", "setmanes"],
          ["dia", "dies"],
          ["hora", "hores"],
          ["minut", "minuts"],
          ["segon", "segons"],
          ["milisegon", "milisegons"],
          ","
        ),
        ckb: language(
          "\u0633\u0627\u06B5",
          "\u0645\u0627\u0646\u06AF",
          "\u0647\u06D5\u0641\u062A\u06D5",
          "\u0695\u06C6\u0698",
          "\u06A9\u0627\u0698\u06CE\u0631",
          "\u062E\u0648\u0644\u06D5\u06A9",
          "\u0686\u0631\u06A9\u06D5",
          "\u0645\u06CC\u0644\u06CC \u0686\u0631\u06A9\u06D5",
          "."
        ),
        cs: language(
          function(c2) {
            return ["rok", "roku", "roky", "let"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["m\u011Bs\xEDc", "m\u011Bs\xEDce", "m\u011Bs\xEDce", "m\u011Bs\xEDc\u016F"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["t\xFDden", "t\xFDdne", "t\xFDdny", "t\xFDdn\u016F"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["den", "dne", "dny", "dn\xED"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["hodina", "hodiny", "hodiny", "hodin"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["minuta", "minuty", "minuty", "minut"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["sekunda", "sekundy", "sekundy", "sekund"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["milisekunda", "milisekundy", "milisekundy", "milisekund"][getCzechOrSlovakForm(c2)];
          },
          ","
        ),
        cy: language(
          "flwyddyn",
          "mis",
          "wythnos",
          "diwrnod",
          "awr",
          "munud",
          "eiliad",
          "milieiliad"
        ),
        da: onesLanguage(
          ["\xE5r", "\xE5r"],
          ["m\xE5ned", "m\xE5neder"],
          ["uge", "uger"],
          ["dag", "dage"],
          ["time", "timer"],
          ["minut", "minutter"],
          ["sekund", "sekunder"],
          ["millisekund", "millisekunder"],
          ","
        ),
        de: onesLanguage(
          ["Jahr", "Jahre"],
          ["Monat", "Monate"],
          ["Woche", "Wochen"],
          ["Tag", "Tage"],
          ["Stunde", "Stunden"],
          ["Minute", "Minuten"],
          ["Sekunde", "Sekunden"],
          ["Millisekunde", "Millisekunden"],
          ","
        ),
        el: GREEK,
        en: onesLanguage(
          ["year", "years"],
          ["month", "months"],
          ["week", "weeks"],
          ["day", "days"],
          ["hour", "hours"],
          ["minute", "minutes"],
          ["second", "seconds"],
          ["millisecond", "milliseconds"]
        ),
        eo: onesLanguage(
          ["jaro", "jaroj"],
          ["monato", "monatoj"],
          ["semajno", "semajnoj"],
          ["tago", "tagoj"],
          ["horo", "horoj"],
          ["minuto", "minutoj"],
          ["sekundo", "sekundoj"],
          ["milisekundo", "milisekundoj"],
          ","
        ),
        es: onesLanguage(
          ["a\xF1o", "a\xF1os"],
          ["mes", "meses"],
          ["semana", "semanas"],
          ["d\xEDa", "d\xEDas"],
          ["hora", "horas"],
          ["minuto", "minutos"],
          ["segundo", "segundos"],
          ["milisegundo", "milisegundos"],
          ","
        ),
        et: onesLanguage(
          ["aasta", "aastat"],
          ["kuu", "kuud"],
          ["n\xE4dal", "n\xE4dalat"],
          ["p\xE4ev", "p\xE4eva"],
          ["tund", "tundi"],
          ["minut", "minutit"],
          ["sekund", "sekundit"],
          ["millisekund", "millisekundit"],
          ","
        ),
        eu: language(
          "urte",
          "hilabete",
          "aste",
          "egun",
          "ordu",
          "minutu",
          "segundo",
          "milisegundo",
          ","
        ),
        fa: language(
          "\u0633\u0627\u0644",
          "\u0645\u0627\u0647",
          "\u0647\u0641\u062A\u0647",
          "\u0631\u0648\u0632",
          "\u0633\u0627\u0639\u062A",
          "\u062F\u0642\u06CC\u0642\u0647",
          "\u062B\u0627\u0646\u06CC\u0647",
          "\u0645\u06CC\u0644\u06CC \u062B\u0627\u0646\u06CC\u0647"
        ),
        fi: onesLanguage(
          ["vuosi", "vuotta"],
          ["kuukausi", "kuukautta"],
          ["viikko", "viikkoa"],
          ["p\xE4iv\xE4", "p\xE4iv\xE4\xE4"],
          ["tunti", "tuntia"],
          ["minuutti", "minuuttia"],
          ["sekunti", "sekuntia"],
          ["millisekunti", "millisekuntia"],
          ","
        ),
        fo: onesLanguage(
          ["\xE1r", "\xE1r"],
          ["m\xE1na\xF0ur", "m\xE1na\xF0ir"],
          ["vika", "vikur"],
          ["dagur", "dagar"],
          ["t\xEDmi", "t\xEDmar"],
          ["minuttur", "minuttir"],
          ["sekund", "sekund"],
          ["millisekund", "millisekund"],
          ","
        ),
        fr: language(
          function(c2) {
            return "an" + (c2 >= 2 ? "s" : "");
          },
          "mois",
          function(c2) {
            return "semaine" + (c2 >= 2 ? "s" : "");
          },
          function(c2) {
            return "jour" + (c2 >= 2 ? "s" : "");
          },
          function(c2) {
            return "heure" + (c2 >= 2 ? "s" : "");
          },
          function(c2) {
            return "minute" + (c2 >= 2 ? "s" : "");
          },
          function(c2) {
            return "seconde" + (c2 >= 2 ? "s" : "");
          },
          function(c2) {
            return "milliseconde" + (c2 >= 2 ? "s" : "");
          },
          ","
        ),
        gr: GREEK,
        he: onesLanguage(
          ["\u05E9\u05E0\u05D4", "\u05E9\u05E0\u05D9\u05DD"],
          ["\u05D7\u05D5\u05D3\u05E9", "\u05D7\u05D5\u05D3\u05E9\u05D9\u05DD"],
          ["\u05E9\u05D1\u05D5\u05E2", "\u05E9\u05D1\u05D5\u05E2\u05D5\u05EA"],
          ["\u05D9\u05D5\u05DD", "\u05D9\u05DE\u05D9\u05DD"],
          ["\u05E9\u05E2\u05D4", "\u05E9\u05E2\u05D5\u05EA"],
          ["\u05D3\u05E7\u05D4", "\u05D3\u05E7\u05D5\u05EA"],
          ["\u05E9\u05E0\u05D9\u05D4", "\u05E9\u05E0\u05D9\u05D5\u05EA"],
          ["\u05DE\u05D9\u05DC\u05D9\u05E9\u05E0\u05D9\u05D9\u05D4", "\u05DE\u05D9\u05DC\u05D9\u05E9\u05E0\u05D9\u05D5\u05EA"]
        ),
        hr: language(
          function(c2) {
            if (c2 % 10 === 2 || c2 % 10 === 3 || c2 % 10 === 4) {
              return "godine";
            }
            return "godina";
          },
          function(c2) {
            if (c2 === 1) {
              return "mjesec";
            } else if (c2 === 2 || c2 === 3 || c2 === 4) {
              return "mjeseca";
            }
            return "mjeseci";
          },
          function(c2) {
            if (c2 % 10 === 1 && c2 !== 11) {
              return "tjedan";
            }
            return "tjedna";
          },
          onesUnit(["dan", "dana"]),
          function(c2) {
            if (c2 === 1) {
              return "sat";
            } else if (c2 === 2 || c2 === 3 || c2 === 4) {
              return "sata";
            }
            return "sati";
          },
          function(c2) {
            var mod10 = c2 % 10;
            if ((mod10 === 2 || mod10 === 3 || mod10 === 4) && (c2 < 10 || c2 > 14)) {
              return "minute";
            }
            return "minuta";
          },
          function(c2) {
            var mod10 = c2 % 10;
            if (mod10 === 5 || Math.floor(c2) === c2 && c2 >= 10 && c2 <= 19) {
              return "sekundi";
            } else if (mod10 === 1) {
              return "sekunda";
            } else if (mod10 === 2 || mod10 === 3 || mod10 === 4) {
              return "sekunde";
            }
            return "sekundi";
          },
          function(c2) {
            if (c2 === 1) {
              return "milisekunda";
            } else if (c2 % 10 === 2 || c2 % 10 === 3 || c2 % 10 === 4) {
              return "milisekunde";
            }
            return "milisekundi";
          },
          ","
        ),
        hi: language(
          "\u0938\u093E\u0932",
          onesUnit(["\u092E\u0939\u0940\u0928\u093E", "\u092E\u0939\u0940\u0928\u0947"]),
          onesUnit(["\u0939\u095E\u094D\u0924\u093E", "\u0939\u092B\u094D\u0924\u0947"]),
          "\u0926\u093F\u0928",
          onesUnit(["\u0918\u0902\u091F\u093E", "\u0918\u0902\u091F\u0947"]),
          "\u092E\u093F\u0928\u091F",
          "\u0938\u0947\u0915\u0902\u0921",
          "\u092E\u093F\u0932\u0940\u0938\u0947\u0915\u0902\u0921"
        ),
        hu: language(
          "\xE9v",
          "h\xF3nap",
          "h\xE9t",
          "nap",
          "\xF3ra",
          "perc",
          "m\xE1sodperc",
          "ezredm\xE1sodperc",
          ","
        ),
        id: language(
          "tahun",
          "bulan",
          "minggu",
          "hari",
          "jam",
          "menit",
          "detik",
          "milidetik"
        ),
        is: onesLanguage(
          ["\xE1r", "\xE1r"],
          ["m\xE1nu\xF0ur", "m\xE1nu\xF0ir"],
          ["vika", "vikur"],
          ["dagur", "dagar"],
          ["klukkut\xEDmi", "klukkut\xEDmar"],
          ["m\xEDn\xFAta", "m\xEDn\xFAtur"],
          ["sek\xFAnda", "sek\xFAndur"],
          ["millisek\xFAnda", "millisek\xFAndur"]
        ),
        it: onesLanguage(
          ["anno", "anni"],
          ["mese", "mesi"],
          ["settimana", "settimane"],
          ["giorno", "giorni"],
          ["ora", "ore"],
          ["minuto", "minuti"],
          ["secondo", "secondi"],
          ["millisecondo", "millisecondi"],
          ","
        ),
        ja: language("\u5E74", "\u30F6\u6708", "\u9031\u9593", "\u65E5", "\u6642\u9593", "\u5206", "\u79D2", "\u30DF\u30EA\u79D2"),
        km: language(
          "\u1786\u17D2\u1793\u17B6\u17C6",
          "\u1781\u17C2",
          "\u179F\u1794\u17D2\u178F\u17B6\u17A0\u17CD",
          "\u1790\u17D2\u1784\u17C3",
          "\u1798\u17C9\u17C4\u1784",
          "\u1793\u17B6\u1791\u17B8",
          "\u179C\u17B7\u1793\u17B6\u1791\u17B8",
          "\u1798\u17B7\u179B\u17D2\u179B\u17B8\u179C\u17B7\u1793\u17B6\u1791\u17B8"
        ),
        kn: onesLanguage(
          ["\u0CB5\u0CB0\u0CCD\u0CB7", "\u0CB5\u0CB0\u0CCD\u0CB7\u0C97\u0CB3\u0CC1"],
          ["\u0CA4\u0CBF\u0C82\u0C97\u0CB3\u0CC1", "\u0CA4\u0CBF\u0C82\u0C97\u0CB3\u0CC1\u0C97\u0CB3\u0CC1"],
          ["\u0CB5\u0CBE\u0CB0", "\u0CB5\u0CBE\u0CB0\u0C97\u0CB3\u0CC1"],
          ["\u0CA6\u0CBF\u0CA8", "\u0CA6\u0CBF\u0CA8\u0C97\u0CB3\u0CC1"],
          ["\u0C97\u0C82\u0C9F\u0CC6", "\u0C97\u0C82\u0C9F\u0CC6\u0C97\u0CB3\u0CC1"],
          ["\u0CA8\u0CBF\u0CAE\u0CBF\u0CB7", "\u0CA8\u0CBF\u0CAE\u0CBF\u0CB7\u0C97\u0CB3\u0CC1"],
          ["\u0CB8\u0CC6\u0C95\u0CC6\u0C82\u0CA1\u0CCD", "\u0CB8\u0CC6\u0C95\u0CC6\u0C82\u0CA1\u0CC1\u0C97\u0CB3\u0CC1"],
          ["\u0CAE\u0CBF\u0CB2\u0CBF\u0CB8\u0CC6\u0C95\u0CC6\u0C82\u0CA1\u0CCD", "\u0CAE\u0CBF\u0CB2\u0CBF\u0CB8\u0CC6\u0C95\u0CC6\u0C82\u0CA1\u0CC1\u0C97\u0CB3\u0CC1"]
        ),
        ko: language("\uB144", "\uAC1C\uC6D4", "\uC8FC\uC77C", "\uC77C", "\uC2DC\uAC04", "\uBD84", "\uCD08", "\uBC00\uB9AC \uCD08"),
        ku: language(
          "sal",
          "meh",
          "hefte",
          "roj",
          "seet",
          "deqe",
          "saniye",
          "m\xEEl\xEE\xE7irk",
          ","
        ),
        lo: language(
          "\u0E9B\u0EB5",
          "\u0EC0\u0E94\u0EB7\u0EAD\u0E99",
          "\u0EAD\u0EB2\u0E97\u0EB4\u0E94",
          "\u0EA1\u0EB7\u0EC9",
          "\u0E8A\u0EBB\u0EC8\u0EA7\u0EC2\u0EA1\u0E87",
          "\u0E99\u0EB2\u0E97\u0EB5",
          "\u0EA7\u0EB4\u0E99\u0EB2\u0E97\u0EB5",
          "\u0EA1\u0EB4\u0E99\u0EA5\u0EB4\u0EA7\u0EB4\u0E99\u0EB2\u0E97\u0EB5",
          ","
        ),
        lt: language(
          function(c2) {
            return c2 % 10 === 0 || c2 % 100 >= 10 && c2 % 100 <= 20 ? "met\u0173" : "metai";
          },
          function(c2) {
            return ["m\u0117nuo", "m\u0117nesiai", "m\u0117nesi\u0173"][getLithuanianForm(c2)];
          },
          function(c2) {
            return ["savait\u0117", "savait\u0117s", "savai\u010Di\u0173"][getLithuanianForm(c2)];
          },
          function(c2) {
            return ["diena", "dienos", "dien\u0173"][getLithuanianForm(c2)];
          },
          function(c2) {
            return ["valanda", "valandos", "valand\u0173"][getLithuanianForm(c2)];
          },
          function(c2) {
            return ["minut\u0117", "minut\u0117s", "minu\u010Di\u0173"][getLithuanianForm(c2)];
          },
          function(c2) {
            return ["sekund\u0117", "sekund\u0117s", "sekund\u017Ei\u0173"][getLithuanianForm(c2)];
          },
          function(c2) {
            return ["milisekund\u0117", "milisekund\u0117s", "milisekund\u017Ei\u0173"][getLithuanianForm(c2)];
          },
          ","
        ),
        lv: language(
          function(c2) {
            return getLatvianForm(c2) ? "gads" : "gadi";
          },
          function(c2) {
            return getLatvianForm(c2) ? "m\u0113nesis" : "m\u0113ne\u0161i";
          },
          function(c2) {
            return getLatvianForm(c2) ? "ned\u0113\u013Ca" : "ned\u0113\u013Cas";
          },
          function(c2) {
            return getLatvianForm(c2) ? "diena" : "dienas";
          },
          function(c2) {
            return getLatvianForm(c2) ? "stunda" : "stundas";
          },
          function(c2) {
            return getLatvianForm(c2) ? "min\u016Bte" : "min\u016Btes";
          },
          function(c2) {
            return getLatvianForm(c2) ? "sekunde" : "sekundes";
          },
          function(c2) {
            return getLatvianForm(c2) ? "milisekunde" : "milisekundes";
          },
          ","
        ),
        mk: onesLanguage(
          ["\u0433\u043E\u0434\u0438\u043D\u0430", "\u0433\u043E\u0434\u0438\u043D\u0438"],
          ["\u043C\u0435\u0441\u0435\u0446", "\u043C\u0435\u0441\u0435\u0446\u0438"],
          ["\u043D\u0435\u0434\u0435\u043B\u0430", "\u043D\u0435\u0434\u0435\u043B\u0438"],
          ["\u0434\u0435\u043D", "\u0434\u0435\u043D\u0430"],
          ["\u0447\u0430\u0441", "\u0447\u0430\u0441\u0430"],
          ["\u043C\u0438\u043D\u0443\u0442\u0430", "\u043C\u0438\u043D\u0443\u0442\u0438"],
          ["\u0441\u0435\u043A\u0443\u043D\u0434\u0430", "\u0441\u0435\u043A\u0443\u043D\u0434\u0438"],
          ["\u043C\u0438\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434\u0430", "\u043C\u0438\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434\u0438"],
          ","
        ),
        mn: language(
          "\u0436\u0438\u043B",
          "\u0441\u0430\u0440",
          "\u0434\u043E\u043B\u043E\u043E \u0445\u043E\u043D\u043E\u0433",
          "\u04E9\u0434\u04E9\u0440",
          "\u0446\u0430\u0433",
          "\u043C\u0438\u043D\u0443\u0442",
          "\u0441\u0435\u043A\u0443\u043D\u0434",
          "\u043C\u0438\u043B\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434"
        ),
        mr: language(
          onesUnit(["\u0935\u0930\u094D\u0937", "\u0935\u0930\u094D\u0937\u0947"]),
          onesUnit(["\u092E\u0939\u093F\u0928\u093E", "\u092E\u0939\u093F\u0928\u0947"]),
          onesUnit(["\u0906\u0920\u0935\u0921\u093E", "\u0906\u0920\u0935\u0921\u0947"]),
          "\u0926\u093F\u0935\u0938",
          "\u0924\u093E\u0938",
          onesUnit(["\u092E\u093F\u0928\u093F\u091F", "\u092E\u093F\u0928\u093F\u091F\u0947"]),
          "\u0938\u0947\u0915\u0902\u0926",
          "\u092E\u093F\u0932\u093F\u0938\u0947\u0915\u0902\u0926"
        ),
        ms: language(
          "tahun",
          "bulan",
          "minggu",
          "hari",
          "jam",
          "minit",
          "saat",
          "milisaat"
        ),
        nl: onesLanguage(
          ["jaar", "jaar"],
          ["maand", "maanden"],
          ["week", "weken"],
          ["dag", "dagen"],
          ["uur", "uur"],
          ["minuut", "minuten"],
          ["seconde", "seconden"],
          ["milliseconde", "milliseconden"],
          ","
        ),
        no: onesLanguage(
          ["\xE5r", "\xE5r"],
          ["m\xE5ned", "m\xE5neder"],
          ["uke", "uker"],
          ["dag", "dager"],
          ["time", "timer"],
          ["minutt", "minutter"],
          ["sekund", "sekunder"],
          ["millisekund", "millisekunder"],
          ","
        ),
        pl: language(
          function(c2) {
            return ["rok", "roku", "lata", "lat"][getPolishForm(c2)];
          },
          function(c2) {
            return ["miesi\u0105c", "miesi\u0105ca", "miesi\u0105ce", "miesi\u0119cy"][getPolishForm(c2)];
          },
          function(c2) {
            return ["tydzie\u0144", "tygodnia", "tygodnie", "tygodni"][getPolishForm(c2)];
          },
          function(c2) {
            return ["dzie\u0144", "dnia", "dni", "dni"][getPolishForm(c2)];
          },
          function(c2) {
            return ["godzina", "godziny", "godziny", "godzin"][getPolishForm(c2)];
          },
          function(c2) {
            return ["minuta", "minuty", "minuty", "minut"][getPolishForm(c2)];
          },
          function(c2) {
            return ["sekunda", "sekundy", "sekundy", "sekund"][getPolishForm(c2)];
          },
          function(c2) {
            return ["milisekunda", "milisekundy", "milisekundy", "milisekund"][getPolishForm(c2)];
          },
          ","
        ),
        pt: onesLanguage(
          ["ano", "anos"],
          ["m\xEAs", "meses"],
          ["semana", "semanas"],
          ["dia", "dias"],
          ["hora", "horas"],
          ["minuto", "minutos"],
          ["segundo", "segundos"],
          ["milissegundo", "milissegundos"],
          ","
        ),
        ro: language(
          romanianUnit("an", "ani", "de ani"),
          romanianUnit("lun\u0103", "luni", "de luni"),
          romanianUnit("s\u0103pt\u0103m\xE2n\u0103", "s\u0103pt\u0103m\xE2ni", "de s\u0103pt\u0103m\xE2ni"),
          romanianUnit("zi", "zile", "de zile"),
          romanianUnit("or\u0103", "ore", "de ore"),
          romanianUnit("minut", "minute", "de minute"),
          romanianUnit("secund\u0103", "secunde", "de secunde"),
          romanianUnit("milisecund\u0103", "milisecunde", "de milisecunde"),
          ","
        ),
        ru: slavicLanguage(
          ["\u043B\u0435\u0442", "\u0433\u043E\u0434", "\u0433\u043E\u0434\u0430"],
          ["\u043C\u0435\u0441\u044F\u0446\u0435\u0432", "\u043C\u0435\u0441\u044F\u0446", "\u043C\u0435\u0441\u044F\u0446\u0430"],
          ["\u043D\u0435\u0434\u0435\u043B\u044C", "\u043D\u0435\u0434\u0435\u043B\u044F", "\u043D\u0435\u0434\u0435\u043B\u0438"],
          ["\u0434\u043D\u0435\u0439", "\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F"],
          ["\u0447\u0430\u0441\u043E\u0432", "\u0447\u0430\u0441", "\u0447\u0430\u0441\u0430"],
          ["\u043C\u0438\u043D\u0443\u0442", "\u043C\u0438\u043D\u0443\u0442\u0430", "\u043C\u0438\u043D\u0443\u0442\u044B"],
          ["\u0441\u0435\u043A\u0443\u043D\u0434", "\u0441\u0435\u043A\u0443\u043D\u0434\u0430", "\u0441\u0435\u043A\u0443\u043D\u0434\u044B"],
          ["\u043C\u0438\u043B\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434", "\u043C\u0438\u043B\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434\u0430", "\u043C\u0438\u043B\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434\u044B"]
        ),
        sq: language(
          onesUnit(["vit", "vjet"]),
          "muaj",
          "jav\xEB",
          "dit\xEB",
          "or\xEB",
          function(c2) {
            return "minut" + (c2 === 1 ? "\xEB" : "a");
          },
          function(c2) {
            return "sekond" + (c2 === 1 ? "\xEB" : "a");
          },
          function(c2) {
            return "milisekond" + (c2 === 1 ? "\xEB" : "a");
          },
          ","
        ),
        sr: slavicLanguage(
          ["\u0433\u043E\u0434\u0438\u043D\u0438", "\u0433\u043E\u0434\u0438\u043D\u0430", "\u0433\u043E\u0434\u0438\u043D\u0435"],
          ["\u043C\u0435\u0441\u0435\u0446\u0438", "\u043C\u0435\u0441\u0435\u0446", "\u043C\u0435\u0441\u0435\u0446\u0430"],
          ["\u043D\u0435\u0434\u0435\u0459\u0438", "\u043D\u0435\u0434\u0435\u0459\u0430", "\u043D\u0435\u0434\u0435\u0459\u0435"],
          ["\u0434\u0430\u043D\u0438", "\u0434\u0430\u043D", "\u0434\u0430\u043D\u0430"],
          ["\u0441\u0430\u0442\u0438", "\u0441\u0430\u0442", "\u0441\u0430\u0442\u0430"],
          ["\u043C\u0438\u043D\u0443\u0442\u0430", "\u043C\u0438\u043D\u0443\u0442", "\u043C\u0438\u043D\u0443\u0442\u0430"],
          ["\u0441\u0435\u043A\u0443\u043D\u0434\u0438", "\u0441\u0435\u043A\u0443\u043D\u0434\u0430", "\u0441\u0435\u043A\u0443\u043D\u0434\u0435"],
          ["\u043C\u0438\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434\u0438", "\u043C\u0438\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434\u0430", "\u043C\u0438\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434\u0435"]
        ),
        sr_Latn: slavicLanguage(
          ["godini", "godina", "godine"],
          ["meseci", "mesec", "meseca"],
          ["nedelji", "nedelja", "nedelje"],
          ["dani", "dan", "dana"],
          ["sati", "sat", "sata"],
          ["minuta", "minut", "minuta"],
          ["sekundi", "sekunda", "sekunde"],
          ["milisekundi", "milisekunda", "milisekunde"]
        ),
        ta: onesLanguage(
          ["\u0BB5\u0BB0\u0BC1\u0B9F\u0BAE\u0BCD", "\u0B86\u0BA3\u0BCD\u0B9F\u0BC1\u0B95\u0BB3\u0BCD"],
          ["\u0BAE\u0BBE\u0BA4\u0BAE\u0BCD", "\u0BAE\u0BBE\u0BA4\u0B99\u0BCD\u0B95\u0BB3\u0BCD"],
          ["\u0BB5\u0BBE\u0BB0\u0BAE\u0BCD", "\u0BB5\u0BBE\u0BB0\u0B99\u0BCD\u0B95\u0BB3\u0BCD"],
          ["\u0BA8\u0BBE\u0BB3\u0BCD", "\u0BA8\u0BBE\u0B9F\u0BCD\u0B95\u0BB3\u0BCD"],
          ["\u0BAE\u0BA3\u0BBF", "\u0BAE\u0BA3\u0BBF\u0BA8\u0BC7\u0BB0\u0BAE\u0BCD"],
          ["\u0BA8\u0BBF\u0BAE\u0BBF\u0B9F\u0BAE\u0BCD", "\u0BA8\u0BBF\u0BAE\u0BBF\u0B9F\u0B99\u0BCD\u0B95\u0BB3\u0BCD"],
          ["\u0BB5\u0BBF\u0BA9\u0BBE\u0B9F\u0BBF", "\u0BB5\u0BBF\u0BA9\u0BBE\u0B9F\u0BBF\u0B95\u0BB3\u0BCD"],
          ["\u0BAE\u0BBF\u0BB2\u0BCD\u0BB2\u0BBF \u0BB5\u0BBF\u0BA8\u0BBE\u0B9F\u0BBF", "\u0BAE\u0BBF\u0BB2\u0BCD\u0BB2\u0BBF \u0BB5\u0BBF\u0BA8\u0BBE\u0B9F\u0BBF\u0B95\u0BB3\u0BCD"]
        ),
        te: onesLanguage(
          ["\u0C38\u0C02\u0C35\u0C24\u0C4D\u0C38\u0C30\u0C02", "\u0C38\u0C02\u0C35\u0C24\u0C4D\u0C38\u0C30\u0C3E\u0C32"],
          ["\u0C28\u0C46\u0C32", "\u0C28\u0C46\u0C32\u0C32"],
          ["\u0C35\u0C3E\u0C30\u0C02", "\u0C35\u0C3E\u0C30\u0C3E\u0C32\u0C41"],
          ["\u0C30\u0C4B\u0C1C\u0C41", "\u0C30\u0C4B\u0C1C\u0C41\u0C32\u0C41"],
          ["\u0C17\u0C02\u0C1F", "\u0C17\u0C02\u0C1F\u0C32\u0C41"],
          ["\u0C28\u0C3F\u0C2E\u0C3F\u0C37\u0C02", "\u0C28\u0C3F\u0C2E\u0C3F\u0C37\u0C3E\u0C32\u0C41"],
          ["\u0C38\u0C46\u0C15\u0C28\u0C41", "\u0C38\u0C46\u0C15\u0C28\u0C4D\u0C32\u0C41"],
          ["\u0C2E\u0C3F\u0C32\u0C4D\u0C32\u0C40\u0C38\u0C46\u0C15\u0C28\u0C4D", "\u0C2E\u0C3F\u0C32\u0C4D\u0C32\u0C40\u0C38\u0C46\u0C15\u0C28\u0C4D\u0C32\u0C41"]
        ),
        uk: slavicLanguage(
          ["\u0440\u043E\u043A\u0456\u0432", "\u0440\u0456\u043A", "\u0440\u043E\u043A\u0438"],
          ["\u043C\u0456\u0441\u044F\u0446\u0456\u0432", "\u043C\u0456\u0441\u044F\u0446\u044C", "\u043C\u0456\u0441\u044F\u0446\u0456"],
          ["\u0442\u0438\u0436\u043D\u0456\u0432", "\u0442\u0438\u0436\u0434\u0435\u043D\u044C", "\u0442\u0438\u0436\u043D\u0456"],
          ["\u0434\u043D\u0456\u0432", "\u0434\u0435\u043D\u044C", "\u0434\u043D\u0456"],
          ["\u0433\u043E\u0434\u0438\u043D", "\u0433\u043E\u0434\u0438\u043D\u0430", "\u0433\u043E\u0434\u0438\u043D\u0438"],
          ["\u0445\u0432\u0438\u043B\u0438\u043D", "\u0445\u0432\u0438\u043B\u0438\u043D\u0430", "\u0445\u0432\u0438\u043B\u0438\u043D\u0438"],
          ["\u0441\u0435\u043A\u0443\u043D\u0434", "\u0441\u0435\u043A\u0443\u043D\u0434\u0430", "\u0441\u0435\u043A\u0443\u043D\u0434\u0438"],
          ["\u043C\u0456\u043B\u0456\u0441\u0435\u043A\u0443\u043D\u0434", "\u043C\u0456\u043B\u0456\u0441\u0435\u043A\u0443\u043D\u0434\u0430", "\u043C\u0456\u043B\u0456\u0441\u0435\u043A\u0443\u043D\u0434\u0438"]
        ),
        ur: language(
          "\u0633\u0627\u0644",
          onesUnit(["\u0645\u06C1\u06CC\u0646\u06C1", "\u0645\u06C1\u06CC\u0646\u06D2"]),
          onesUnit(["\u06C1\u0641\u062A\u06C1", "\u06C1\u0641\u062A\u06D2"]),
          "\u062F\u0646",
          onesUnit(["\u06AF\u06BE\u0646\u0679\u06C1", "\u06AF\u06BE\u0646\u0679\u06D2"]),
          "\u0645\u0646\u0679",
          "\u0633\u06CC\u06A9\u0646\u0688",
          "\u0645\u0644\u06CC \u0633\u06CC\u06A9\u0646\u0688"
        ),
        sk: language(
          function(c2) {
            return ["rok", "roky", "roky", "rokov"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["mesiac", "mesiace", "mesiace", "mesiacov"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["t\xFD\u017Ede\u0148", "t\xFD\u017Edne", "t\xFD\u017Edne", "t\xFD\u017Ed\u0148ov"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["de\u0148", "dni", "dni", "dn\xED"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["hodina", "hodiny", "hodiny", "hod\xEDn"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["min\xFAta", "min\xFAty", "min\xFAty", "min\xFAt"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["sekunda", "sekundy", "sekundy", "sek\xFAnd"][getCzechOrSlovakForm(c2)];
          },
          function(c2) {
            return ["milisekunda", "milisekundy", "milisekundy", "milisek\xFAnd"][getCzechOrSlovakForm(c2)];
          },
          ","
        ),
        sl: language(
          function(c2) {
            if (c2 % 10 === 1) {
              return "leto";
            } else if (c2 % 100 === 2) {
              return "leti";
            } else if (c2 % 100 === 3 || c2 % 100 === 4 || Math.floor(c2) !== c2 && c2 % 100 <= 5) {
              return "leta";
            } else {
              return "let";
            }
          },
          function(c2) {
            if (c2 % 10 === 1) {
              return "mesec";
            } else if (c2 % 100 === 2 || Math.floor(c2) !== c2 && c2 % 100 <= 5) {
              return "meseca";
            } else if (c2 % 10 === 3 || c2 % 10 === 4) {
              return "mesece";
            } else {
              return "mesecev";
            }
          },
          function(c2) {
            if (c2 % 10 === 1) {
              return "teden";
            } else if (c2 % 10 === 2 || Math.floor(c2) !== c2 && c2 % 100 <= 4) {
              return "tedna";
            } else if (c2 % 10 === 3 || c2 % 10 === 4) {
              return "tedne";
            } else {
              return "tednov";
            }
          },
          function(c2) {
            return c2 % 100 === 1 ? "dan" : "dni";
          },
          function(c2) {
            if (c2 % 10 === 1) {
              return "ura";
            } else if (c2 % 100 === 2) {
              return "uri";
            } else if (c2 % 10 === 3 || c2 % 10 === 4 || Math.floor(c2) !== c2) {
              return "ure";
            } else {
              return "ur";
            }
          },
          function(c2) {
            if (c2 % 10 === 1) {
              return "minuta";
            } else if (c2 % 10 === 2) {
              return "minuti";
            } else if (c2 % 10 === 3 || c2 % 10 === 4 || Math.floor(c2) !== c2 && c2 % 100 <= 4) {
              return "minute";
            } else {
              return "minut";
            }
          },
          function(c2) {
            if (c2 % 10 === 1) {
              return "sekunda";
            } else if (c2 % 100 === 2) {
              return "sekundi";
            } else if (c2 % 100 === 3 || c2 % 100 === 4 || Math.floor(c2) !== c2) {
              return "sekunde";
            } else {
              return "sekund";
            }
          },
          function(c2) {
            if (c2 % 10 === 1) {
              return "milisekunda";
            } else if (c2 % 100 === 2) {
              return "milisekundi";
            } else if (c2 % 100 === 3 || c2 % 100 === 4 || Math.floor(c2) !== c2) {
              return "milisekunde";
            } else {
              return "milisekund";
            }
          },
          ","
        ),
        sv: onesLanguage(
          ["\xE5r", "\xE5r"],
          ["m\xE5nad", "m\xE5nader"],
          ["vecka", "veckor"],
          ["dag", "dagar"],
          ["timme", "timmar"],
          ["minut", "minuter"],
          ["sekund", "sekunder"],
          ["millisekund", "millisekunder"],
          ","
        ),
        sw: assign(
          onesLanguage(
            ["mwaka", "miaka"],
            ["mwezi", "miezi"],
            ["wiki", "wiki"],
            ["siku", "masiku"],
            ["saa", "masaa"],
            ["dakika", "dakika"],
            ["sekunde", "sekunde"],
            ["milisekunde", "milisekunde"]
          ),
          { _numberFirst: true }
        ),
        tr: language(
          "y\u0131l",
          "ay",
          "hafta",
          "g\xFCn",
          "saat",
          "dakika",
          "saniye",
          "milisaniye",
          ","
        ),
        th: language(
          "\u0E1B\u0E35",
          "\u0E40\u0E14\u0E37\u0E2D\u0E19",
          "\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C",
          "\u0E27\u0E31\u0E19",
          "\u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07",
          "\u0E19\u0E32\u0E17\u0E35",
          "\u0E27\u0E34\u0E19\u0E32\u0E17\u0E35",
          "\u0E21\u0E34\u0E25\u0E25\u0E34\u0E27\u0E34\u0E19\u0E32\u0E17\u0E35"
        ),
        uz: language(
          "yil",
          "oy",
          "hafta",
          "kun",
          "soat",
          "minut",
          "sekund",
          "millisekund"
        ),
        uz_CYR: language(
          "\u0439\u0438\u043B",
          "\u043E\u0439",
          "\u04B3\u0430\u0444\u0442\u0430",
          "\u043A\u0443\u043D",
          "\u0441\u043E\u0430\u0442",
          "\u043C\u0438\u043D\u0443\u0442",
          "\u0441\u0435\u043A\u0443\u043D\u0434",
          "\u043C\u0438\u043B\u043B\u0438\u0441\u0435\u043A\u0443\u043D\u0434"
        ),
        vi: language(
          "n\u0103m",
          "th\xE1ng",
          "tu\u1EA7n",
          "ng\xE0y",
          "gi\u1EDD",
          "ph\xFAt",
          "gi\xE2y",
          "mili gi\xE2y",
          ","
        ),
        zh_CN: language("\u5E74", "\u4E2A\u6708", "\u5468", "\u5929", "\u5C0F\u65F6", "\u5206\u949F", "\u79D2", "\u6BEB\u79D2"),
        zh_TW: language("\u5E74", "\u500B\u6708", "\u5468", "\u5929", "\u5C0F\u6642", "\u5206\u9418", "\u79D2", "\u6BEB\u79D2")
      };
      function language(y2, mo, w, d2, h, m2, s, ms, decimal) {
        var result = { y: y2, mo, w, d: d2, h, m: m2, s, ms };
        if (decimal) {
          result.decimal = decimal;
        }
        return result;
      }
      function onesUnit(unit) {
        return function(c2) {
          return c2 === 1 ? unit[0] : unit[1];
        };
      }
      function onesLanguage(y2, mo, w, d2, h, m2, s, ms, decimal) {
        return language(
          onesUnit(y2),
          onesUnit(mo),
          onesUnit(w),
          onesUnit(d2),
          onesUnit(h),
          onesUnit(m2),
          onesUnit(s),
          onesUnit(ms),
          decimal
        );
      }
      function romanianUnit(single, plural, pluralWithDe) {
        return function(c2) {
          if (c2 === 1) {
            return single;
          }
          if (Math.floor(c2) !== c2 || c2 === 0) {
            return plural;
          }
          var remainder = c2 % 100;
          if (remainder >= 1 && remainder <= 19) {
            return plural;
          }
          return pluralWithDe;
        };
      }
      function slavicUnit(unit) {
        return function(c2) {
          if (Math.floor(c2) !== c2) {
            return unit[2];
          }
          if (c2 % 100 >= 5 && c2 % 100 <= 20 || c2 % 10 >= 5 && c2 % 10 <= 9 || c2 % 10 === 0) {
            return unit[0];
          }
          if (c2 % 10 === 1) {
            return unit[1];
          }
          if (c2 > 1) {
            return unit[2];
          }
          return unit[1];
        };
      }
      function slavicLanguage(y2, mo, w, d2, h, m2, s, ms) {
        return language(
          slavicUnit(y2),
          slavicUnit(mo),
          slavicUnit(w),
          slavicUnit(d2),
          slavicUnit(h),
          slavicUnit(m2),
          slavicUnit(s),
          slavicUnit(ms),
          ","
        );
      }
      function getArabicForm(c2) {
        if (c2 === 2) {
          return 1;
        }
        if (c2 > 2 && c2 < 11) {
          return 2;
        }
        return 0;
      }
      function getPolishForm(c2) {
        if (c2 === 1) {
          return 0;
        }
        if (Math.floor(c2) !== c2) {
          return 1;
        }
        if (c2 % 10 >= 2 && c2 % 10 <= 4 && !(c2 % 100 > 10 && c2 % 100 < 20)) {
          return 2;
        }
        return 3;
      }
      function getCzechOrSlovakForm(c2) {
        if (c2 === 1) {
          return 0;
        }
        if (Math.floor(c2) !== c2) {
          return 1;
        }
        if (c2 % 10 >= 2 && c2 % 10 <= 4 && c2 % 100 < 10) {
          return 2;
        }
        return 3;
      }
      function getLithuanianForm(c2) {
        if (c2 === 1 || c2 % 10 === 1 && c2 % 100 > 20) {
          return 0;
        }
        if (Math.floor(c2) !== c2 || c2 % 10 >= 2 && c2 % 100 > 20 || c2 % 10 >= 2 && c2 % 100 < 10) {
          return 1;
        }
        return 2;
      }
      function getLatvianForm(c2) {
        return c2 % 10 === 1 && c2 % 100 !== 11;
      }
      function has(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
      }
      function getLanguage(options) {
        var possibleLanguages = [options.language];
        if (has(options, "fallbacks")) {
          if (isArray3(options.fallbacks) && options.fallbacks.length) {
            possibleLanguages = possibleLanguages.concat(options.fallbacks);
          } else {
            throw new Error("fallbacks must be an array with at least one element");
          }
        }
        for (var i2 = 0; i2 < possibleLanguages.length; i2++) {
          var languageToTry = possibleLanguages[i2];
          if (has(options.languages, languageToTry)) {
            return options.languages[languageToTry];
          }
          if (has(LANGUAGES, languageToTry)) {
            return LANGUAGES[languageToTry];
          }
        }
        throw new Error("No language found.");
      }
      function renderPiece(piece, language2, options) {
        var unitName = piece.unitName;
        var unitCount = piece.unitCount;
        var spacer = options.spacer;
        var maxDecimalPoints = options.maxDecimalPoints;
        var decimal;
        if (has(options, "decimal")) {
          decimal = options.decimal;
        } else if (has(language2, "decimal")) {
          decimal = language2.decimal;
        } else {
          decimal = ".";
        }
        var digitReplacements;
        if ("digitReplacements" in options) {
          digitReplacements = options.digitReplacements;
        } else if ("_digitReplacements" in language2) {
          digitReplacements = language2._digitReplacements;
        }
        var formattedCount;
        var normalizedUnitCount = maxDecimalPoints === void 0 ? unitCount : Math.floor(unitCount * Math.pow(10, maxDecimalPoints)) / Math.pow(10, maxDecimalPoints);
        var countStr = normalizedUnitCount.toString();
        if (language2._hideCountIf2 && unitCount === 2) {
          formattedCount = "";
          spacer = "";
        } else {
          if (digitReplacements) {
            formattedCount = "";
            for (var i2 = 0; i2 < countStr.length; i2++) {
              var character = countStr[i2];
              if (character === ".") {
                formattedCount += decimal;
              } else {
                formattedCount += digitReplacements[
                  /** @type {"0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"} */
                  character
                ];
              }
            }
          } else {
            formattedCount = countStr.replace(".", decimal);
          }
        }
        var languageWord = language2[unitName];
        var word;
        if (typeof languageWord === "function") {
          word = languageWord(unitCount);
        } else {
          word = languageWord;
        }
        if (language2._numberFirst) {
          return word + spacer + formattedCount;
        }
        return formattedCount + spacer + word;
      }
      function getPieces(ms, options) {
        var unitName;
        var i2;
        var unitCount;
        var msRemaining;
        var units = options.units;
        var unitMeasures = options.unitMeasures;
        var largest = "largest" in options ? options.largest : Infinity;
        if (!units.length) return [];
        var unitCounts = {};
        msRemaining = ms;
        for (i2 = 0; i2 < units.length; i2++) {
          unitName = units[i2];
          var unitMs = unitMeasures[unitName];
          var isLast = i2 === units.length - 1;
          unitCount = isLast ? msRemaining / unitMs : Math.floor(msRemaining / unitMs);
          unitCounts[unitName] = unitCount;
          msRemaining -= unitCount * unitMs;
        }
        if (options.round) {
          var unitsRemainingBeforeRound = largest;
          for (i2 = 0; i2 < units.length; i2++) {
            unitName = units[i2];
            unitCount = unitCounts[unitName];
            if (unitCount === 0) continue;
            unitsRemainingBeforeRound--;
            if (unitsRemainingBeforeRound === 0) {
              for (var j = i2 + 1; j < units.length; j++) {
                var smallerUnitName = units[j];
                var smallerUnitCount = unitCounts[smallerUnitName];
                unitCounts[unitName] += smallerUnitCount * unitMeasures[smallerUnitName] / unitMeasures[unitName];
                unitCounts[smallerUnitName] = 0;
              }
              break;
            }
          }
          for (i2 = units.length - 1; i2 >= 0; i2--) {
            unitName = units[i2];
            unitCount = unitCounts[unitName];
            if (unitCount === 0) continue;
            var rounded = Math.round(unitCount);
            unitCounts[unitName] = rounded;
            if (i2 === 0) break;
            var previousUnitName = units[i2 - 1];
            var previousUnitMs = unitMeasures[previousUnitName];
            var amountOfPreviousUnit = Math.floor(
              rounded * unitMeasures[unitName] / previousUnitMs
            );
            if (amountOfPreviousUnit) {
              unitCounts[previousUnitName] += amountOfPreviousUnit;
              unitCounts[unitName] = 0;
            } else {
              break;
            }
          }
        }
        var result = [];
        for (i2 = 0; i2 < units.length && result.length < largest; i2++) {
          unitName = units[i2];
          unitCount = unitCounts[unitName];
          if (unitCount) {
            result.push({ unitName, unitCount });
          }
        }
        return result;
      }
      function formatPieces(pieces, options) {
        var language2 = getLanguage(options);
        if (!pieces.length) {
          var units = options.units;
          var smallestUnitName = units[units.length - 1];
          return renderPiece(
            { unitName: smallestUnitName, unitCount: 0 },
            language2,
            options
          );
        }
        var conjunction = options.conjunction;
        var serialComma = options.serialComma;
        var delimiter;
        if (has(options, "delimiter")) {
          delimiter = options.delimiter;
        } else if (has(language2, "delimiter")) {
          delimiter = language2.delimiter;
        } else {
          delimiter = ", ";
        }
        var renderedPieces = [];
        for (var i2 = 0; i2 < pieces.length; i2++) {
          renderedPieces.push(renderPiece(pieces[i2], language2, options));
        }
        if (!conjunction || pieces.length === 1) {
          return renderedPieces.join(delimiter);
        }
        if (pieces.length === 2) {
          return renderedPieces.join(conjunction);
        }
        return renderedPieces.slice(0, -1).join(delimiter) + (serialComma ? "," : "") + conjunction + renderedPieces.slice(-1);
      }
      function humanizer(passedOptions) {
        var result = function humanizer2(ms, humanizerOptions) {
          ms = Math.abs(ms);
          var options = assign({}, result, humanizerOptions || {});
          var pieces = getPieces(ms, options);
          return formatPieces(pieces, options);
        };
        return assign(
          result,
          {
            language: "en",
            spacer: " ",
            conjunction: "",
            serialComma: true,
            units: ["y", "mo", "w", "d", "h", "m", "s"],
            languages: {},
            round: false,
            unitMeasures: {
              y: 315576e5,
              mo: 26298e5,
              w: 6048e5,
              d: 864e5,
              h: 36e5,
              m: 6e4,
              s: 1e3,
              ms: 1
            }
          },
          passedOptions
        );
      }
      var humanizeDuration2 = assign(humanizer({}), {
        /**
         * Get a list of supported languages.
         *
         * @returns {string[]} An array of language codes
         */
        getSupportedLanguages: function getSupportedLanguages() {
          var result = [];
          for (var language2 in LANGUAGES) {
            if (has(LANGUAGES, language2) && language2 !== "gr") {
              result.push(language2);
            }
          }
          return result;
        },
        humanizer
      });
      if (typeof define === "function" && define.amd) {
        define(function() {
          return humanizeDuration2;
        });
      } else if (typeof module !== "undefined" && module.exports) {
        module.exports = humanizeDuration2;
      } else {
        this.humanizeDuration = humanizeDuration2;
      }
    })();
  }
});

// src/webhooks/handler.ts
import { withTenant as withTenant8 } from "@cgk-platform/db";

// src/webhooks/handlers/app.ts
import { withTenant, sql } from "@cgk-platform/db";
async function handleAppUninstalled(tenantId, payload, _eventId) {
  const shop = payload;
  const shopDomain = shop.myshopify_domain || shop.domain || "";
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE shopify_connections
      SET
        status = 'disconnected',
        access_token_encrypted = NULL,
        webhook_secret_encrypted = NULL
      WHERE shop = ${shopDomain}
    `;
    await sql`
      UPDATE webhook_registrations
      SET
        status = 'deleted',
        updated_at = NOW()
      WHERE shop = ${shopDomain}
    `;
  });
  console.log(`[Webhook] App uninstalled for shop ${shopDomain}, tenant ${tenantId}`);
}

// src/webhooks/handlers/customers.ts
import { withTenant as withTenant2, sql as sql2 } from "@cgk-platform/db";

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_2) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_2, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t2 = typeof data;
  switch (t2) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i2 = 0;
          while (i2 < issue.path.length) {
            const el = issue.path[i2];
            const terminal = i2 === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i2++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m2) => !!m2).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap3, invalid_type_error, required_error, description } = params;
  if (errorMap3 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap3)
    return { errorMap: errorMap3, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i2) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i2));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i2) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i2));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a2, b2) {
  const aType = getParsedType(a2);
  const bType = getParsedType(b2);
  if (a2 === b2) {
    return { valid: true, data: a2 };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b2);
    const sharedKeys = util.objectKeys(a2).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a2, ...b2 };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a2[key], b2[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a2.length !== b2.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a2.length; index++) {
      const itemA = a2[index];
      const itemB = b2[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a2 === +b2) {
    return { valid: true, data: a2 };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i2) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i2)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a2, b2) {
    return new _ZodPipeline({
      in: a2,
      out: b2,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p2 = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p22 = typeof p2 === "string" ? { message: p2 } : p2;
  return p22;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r2 = check(data);
      if (r2 instanceof Promise) {
        return r2.then((r3) => {
          if (!r3) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r2) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/index.js
var zod_default = external_exports;

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/version.js
var VERSION = "4.3.3";

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/jwt.js
var JWT_ALGORITHM = "HS256";
var JWT_ISSUER = "https://id.trigger.dev";
var JWT_AUDIENCE = "https://api.trigger.dev";
async function generateJWT(options) {
  const { SignJWT } = await import("../esm-D6BMRDT5.js");
  const secret = new TextEncoder().encode(options.secretKey);
  return new SignJWT(options.payload).setIssuer(JWT_ISSUER).setAudience(JWT_AUDIENCE).setProtectedHeader({ alg: JWT_ALGORITHM }).setIssuedAt().setExpirationTime(options.expirationTime ?? "15m").sign(secret);
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/tokens.js
var CreateAuthorizationCodeResponseSchema = external_exports.object({
  url: external_exports.string().url(),
  authorizationCode: external_exports.string()
});
var GetPersonalAccessTokenRequestSchema = external_exports.object({
  authorizationCode: external_exports.string()
});
var GetPersonalAccessTokenResponseSchema = external_exports.object({
  token: external_exports.object({
    token: external_exports.string(),
    obfuscatedToken: external_exports.string()
  }).nullable()
});

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/schemas/json.js
var LiteralSchema = external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean(), external_exports.null()]);
var DeserializedJsonSchema = external_exports.lazy(() => external_exports.union([LiteralSchema, external_exports.array(DeserializedJsonSchema), external_exports.record(DeserializedJsonSchema)]));
var SerializableSchema = external_exports.union([
  external_exports.string(),
  external_exports.number(),
  external_exports.boolean(),
  external_exports.null(),
  external_exports.date(),
  external_exports.undefined(),
  external_exports.symbol()
]);
var SerializableJsonSchema = external_exports.lazy(() => external_exports.union([SerializableSchema, external_exports.array(SerializableJsonSchema), external_exports.record(SerializableJsonSchema)]));

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/common.js
var RunMetadataUpdateOperation = external_exports.object({
  type: external_exports.literal("update"),
  value: external_exports.record(external_exports.unknown())
});
var RunMetadataSetKeyOperation = external_exports.object({
  type: external_exports.literal("set"),
  key: external_exports.string(),
  value: DeserializedJsonSchema
});
var RunMetadataDeleteKeyOperation = external_exports.object({
  type: external_exports.literal("delete"),
  key: external_exports.string()
});
var RunMetadataAppendKeyOperation = external_exports.object({
  type: external_exports.literal("append"),
  key: external_exports.string(),
  value: DeserializedJsonSchema
});
var RunMetadataRemoveFromKeyOperation = external_exports.object({
  type: external_exports.literal("remove"),
  key: external_exports.string(),
  value: DeserializedJsonSchema
});
var RunMetadataIncrementKeyOperation = external_exports.object({
  type: external_exports.literal("increment"),
  key: external_exports.string(),
  value: external_exports.number()
});
var RunMetadataChangeOperation = external_exports.discriminatedUnion("type", [
  RunMetadataUpdateOperation,
  RunMetadataSetKeyOperation,
  RunMetadataDeleteKeyOperation,
  RunMetadataAppendKeyOperation,
  RunMetadataRemoveFromKeyOperation,
  RunMetadataIncrementKeyOperation
]);
var FlushedRunMetadata = external_exports.object({
  metadata: external_exports.record(DeserializedJsonSchema).optional(),
  operations: external_exports.array(RunMetadataChangeOperation).optional(),
  parentOperations: external_exports.array(RunMetadataChangeOperation).optional(),
  rootOperations: external_exports.array(RunMetadataChangeOperation).optional()
});
var MachineCpu = external_exports.union([
  external_exports.literal(0.25),
  external_exports.literal(0.5),
  external_exports.literal(1),
  external_exports.literal(2),
  external_exports.literal(4)
]);
var MachineMemory = external_exports.union([
  external_exports.literal(0.25),
  external_exports.literal(0.5),
  external_exports.literal(1),
  external_exports.literal(2),
  external_exports.literal(4),
  external_exports.literal(8)
]);
var MachinePresetName = external_exports.enum([
  "micro",
  "small-1x",
  "small-2x",
  "medium-1x",
  "medium-2x",
  "large-1x",
  "large-2x"
]);
var MachineConfig = external_exports.object({
  cpu: MachineCpu.optional(),
  memory: MachineMemory.optional(),
  preset: MachinePresetName.optional()
});
var MachinePreset = external_exports.object({
  name: MachinePresetName,
  /** unit: vCPU */
  cpu: external_exports.number(),
  /** unit: GB */
  memory: external_exports.number(),
  centsPerMs: external_exports.number()
});
var TaskRunBuiltInError = external_exports.object({
  type: external_exports.literal("BUILT_IN_ERROR"),
  name: external_exports.string(),
  message: external_exports.string(),
  stackTrace: external_exports.string()
});
var TaskRunCustomErrorObject = external_exports.object({
  type: external_exports.literal("CUSTOM_ERROR"),
  raw: external_exports.string()
});
var TaskRunStringError = external_exports.object({
  type: external_exports.literal("STRING_ERROR"),
  raw: external_exports.string()
});
var TaskRunInternalError = external_exports.object({
  type: external_exports.literal("INTERNAL_ERROR"),
  code: external_exports.enum([
    "COULD_NOT_FIND_EXECUTOR",
    "COULD_NOT_FIND_TASK",
    "COULD_NOT_IMPORT_TASK",
    "CONFIGURED_INCORRECTLY",
    "TASK_ALREADY_RUNNING",
    "TASK_EXECUTION_FAILED",
    "TASK_EXECUTION_ABORTED",
    "TASK_PROCESS_EXITED_WITH_NON_ZERO_CODE",
    "TASK_PROCESS_SIGKILL_TIMEOUT",
    "TASK_PROCESS_SIGSEGV",
    "TASK_PROCESS_SIGTERM",
    "TASK_PROCESS_OOM_KILLED",
    "TASK_PROCESS_MAYBE_OOM_KILLED",
    "TASK_RUN_CANCELLED",
    "TASK_INPUT_ERROR",
    "TASK_OUTPUT_ERROR",
    "TASK_MIDDLEWARE_ERROR",
    "HANDLE_ERROR_ERROR",
    "GRACEFUL_EXIT_TIMEOUT",
    "TASK_RUN_HEARTBEAT_TIMEOUT",
    "TASK_RUN_CRASHED",
    "MAX_DURATION_EXCEEDED",
    "DISK_SPACE_EXCEEDED",
    "POD_EVICTED",
    "POD_UNKNOWN_ERROR",
    "TASK_HAS_N0_EXECUTION_SNAPSHOT",
    "TASK_DEQUEUED_INVALID_STATE",
    "TASK_DEQUEUED_QUEUE_NOT_FOUND",
    "TASK_RUN_DEQUEUED_MAX_RETRIES",
    "TASK_RUN_STALLED_EXECUTING",
    "TASK_RUN_STALLED_EXECUTING_WITH_WAITPOINTS",
    "OUTDATED_SDK_VERSION",
    "TASK_DID_CONCURRENT_WAIT",
    "RECURSIVE_WAIT_DEADLOCK"
  ]),
  message: external_exports.string().optional(),
  stackTrace: external_exports.string().optional()
});
var TaskRunErrorCodes = TaskRunInternalError.shape.code.enum;
var TaskRunError = external_exports.discriminatedUnion("type", [
  TaskRunBuiltInError,
  TaskRunCustomErrorObject,
  TaskRunStringError,
  TaskRunInternalError
]);
var TaskRun = external_exports.object({
  id: external_exports.string(),
  payload: external_exports.string(),
  payloadType: external_exports.string(),
  tags: external_exports.array(external_exports.string()),
  isTest: external_exports.boolean().default(false),
  createdAt: external_exports.coerce.date(),
  startedAt: external_exports.coerce.date().default(() => /* @__PURE__ */ new Date()),
  /** The user-provided idempotency key (not the hash) */
  idempotencyKey: external_exports.string().optional(),
  /** The scope of the idempotency key */
  idempotencyKeyScope: external_exports.enum(["run", "attempt", "global"]).optional(),
  maxAttempts: external_exports.number().optional(),
  version: external_exports.string().optional(),
  metadata: external_exports.record(DeserializedJsonSchema).optional(),
  maxDuration: external_exports.number().optional(),
  /** The priority of the run. Wih a value of 10 it will be dequeued before runs that were triggered 9 seconds before it (assuming they had no priority set).  */
  priority: external_exports.number().optional(),
  baseCostInCents: external_exports.number().optional(),
  parentTaskRunId: external_exports.string().optional(),
  rootTaskRunId: external_exports.string().optional(),
  // These are only used during execution, not in run.ctx
  durationMs: external_exports.number().optional(),
  costInCents: external_exports.number().optional(),
  region: external_exports.string().optional()
});
var GitMeta = external_exports.object({
  provider: external_exports.string().optional(),
  source: external_exports.enum(["trigger_github_app", "github_actions", "local"]).optional(),
  ghUsername: external_exports.string().optional(),
  ghUserAvatarUrl: external_exports.string().optional(),
  commitAuthorName: external_exports.string().optional(),
  commitMessage: external_exports.string().optional(),
  commitRef: external_exports.string().optional(),
  commitSha: external_exports.string().optional(),
  dirty: external_exports.boolean().optional(),
  remoteUrl: external_exports.string().optional(),
  pullRequestNumber: external_exports.number().optional(),
  pullRequestTitle: external_exports.string().optional(),
  pullRequestState: external_exports.enum(["open", "closed", "merged"]).optional()
});
var TaskRunExecutionTask = external_exports.object({
  id: external_exports.string(),
  filePath: external_exports.string()
});
var TaskRunExecutionAttempt = external_exports.object({
  number: external_exports.number(),
  startedAt: external_exports.coerce.date()
});
var TaskRunExecutionEnvironment = external_exports.object({
  id: external_exports.string(),
  slug: external_exports.string(),
  type: external_exports.enum(["PRODUCTION", "STAGING", "DEVELOPMENT", "PREVIEW"]),
  branchName: external_exports.string().optional(),
  git: GitMeta.optional()
});
var TaskRunExecutionOrganization = external_exports.object({
  id: external_exports.string(),
  slug: external_exports.string(),
  name: external_exports.string()
});
var TaskRunExecutionProject = external_exports.object({
  id: external_exports.string(),
  ref: external_exports.string(),
  slug: external_exports.string(),
  name: external_exports.string()
});
var TaskRunExecutionQueue = external_exports.object({
  id: external_exports.string(),
  name: external_exports.string()
});
var TaskRunExecutionBatch = external_exports.object({
  id: external_exports.string()
});
var TaskRunExecutionDeployment = external_exports.object({
  id: external_exports.string(),
  shortCode: external_exports.string(),
  version: external_exports.string(),
  runtime: external_exports.string(),
  runtimeVersion: external_exports.string(),
  git: GitMeta.optional()
});
var StaticTaskRunExecutionShape = {
  // Passthrough needed for backwards compatibility
  task: TaskRunExecutionTask.passthrough(),
  queue: TaskRunExecutionQueue,
  environment: TaskRunExecutionEnvironment,
  organization: TaskRunExecutionOrganization,
  project: TaskRunExecutionProject,
  machine: MachinePreset,
  batch: TaskRunExecutionBatch.optional(),
  deployment: TaskRunExecutionDeployment.optional()
};
var StaticTaskRunExecution = external_exports.object(StaticTaskRunExecutionShape);
var TaskRunExecution = external_exports.object({
  // Passthrough needed for backwards compatibility
  attempt: TaskRunExecutionAttempt.passthrough(),
  run: TaskRun.and(external_exports.object({
    traceContext: external_exports.record(external_exports.unknown()).optional(),
    realtimeStreamsVersion: external_exports.string().optional()
  })),
  ...StaticTaskRunExecutionShape
});
var V3TaskRunExecutionTask = external_exports.object({
  id: external_exports.string(),
  filePath: external_exports.string(),
  exportName: external_exports.string().optional()
});
var V3TaskRunExecutionAttempt = external_exports.object({
  number: external_exports.number(),
  startedAt: external_exports.coerce.date(),
  id: external_exports.string(),
  backgroundWorkerId: external_exports.string(),
  backgroundWorkerTaskId: external_exports.string(),
  status: external_exports.string()
});
var V3TaskRun = external_exports.object({
  id: external_exports.string(),
  payload: external_exports.string(),
  payloadType: external_exports.string(),
  tags: external_exports.array(external_exports.string()),
  isTest: external_exports.boolean().default(false),
  createdAt: external_exports.coerce.date(),
  startedAt: external_exports.coerce.date().default(() => /* @__PURE__ */ new Date()),
  /** The user-provided idempotency key (not the hash) */
  idempotencyKey: external_exports.string().optional(),
  /** The scope of the idempotency key */
  idempotencyKeyScope: external_exports.enum(["run", "attempt", "global"]).optional(),
  maxAttempts: external_exports.number().optional(),
  version: external_exports.string().optional(),
  metadata: external_exports.record(DeserializedJsonSchema).optional(),
  maxDuration: external_exports.number().optional(),
  context: external_exports.unknown(),
  durationMs: external_exports.number(),
  costInCents: external_exports.number(),
  baseCostInCents: external_exports.number()
});
var V3TaskRunExecution = external_exports.object({
  task: V3TaskRunExecutionTask,
  attempt: V3TaskRunExecutionAttempt,
  run: V3TaskRun.and(external_exports.object({
    traceContext: external_exports.record(external_exports.unknown()).optional()
  })),
  queue: TaskRunExecutionQueue,
  environment: TaskRunExecutionEnvironment,
  organization: TaskRunExecutionOrganization,
  project: TaskRunExecutionProject,
  machine: MachinePreset,
  batch: TaskRunExecutionBatch.optional()
});
var TaskRunContext = external_exports.object({
  attempt: TaskRunExecutionAttempt,
  run: TaskRun.omit({
    payload: true,
    payloadType: true,
    metadata: true,
    durationMs: true,
    costInCents: true
  }),
  ...StaticTaskRunExecutionShape
});
var V3TaskRunExecutionEnvironment = external_exports.object({
  id: external_exports.string(),
  slug: external_exports.string(),
  type: external_exports.enum(["PRODUCTION", "STAGING", "DEVELOPMENT", "PREVIEW"])
});
var V3TaskRunContext = external_exports.object({
  attempt: V3TaskRunExecutionAttempt.omit({
    backgroundWorkerId: true,
    backgroundWorkerTaskId: true
  }),
  run: V3TaskRun.omit({
    payload: true,
    payloadType: true,
    metadata: true
  }),
  task: V3TaskRunExecutionTask,
  queue: TaskRunExecutionQueue,
  environment: V3TaskRunExecutionEnvironment,
  organization: TaskRunExecutionOrganization,
  project: TaskRunExecutionProject,
  batch: TaskRunExecutionBatch.optional(),
  machine: MachinePreset.optional()
});
var TaskRunExecutionRetry = external_exports.object({
  timestamp: external_exports.number(),
  /** Retry delay in milliseconds */
  delay: external_exports.number(),
  error: external_exports.unknown().optional()
});
var TaskRunExecutionUsage = external_exports.object({
  durationMs: external_exports.number()
});
var TaskRunFailedExecutionResult = external_exports.object({
  ok: external_exports.literal(false),
  id: external_exports.string(),
  error: TaskRunError,
  retry: TaskRunExecutionRetry.optional(),
  skippedRetrying: external_exports.boolean().optional(),
  usage: TaskRunExecutionUsage.optional(),
  // Optional for now for backwards compatibility
  taskIdentifier: external_exports.string().optional(),
  // This is deprecated, use flushedMetadata instead
  metadata: FlushedRunMetadata.optional(),
  // This is the new way to flush metadata
  flushedMetadata: external_exports.object({
    data: external_exports.string().optional(),
    dataType: external_exports.string()
  }).optional()
});
var TaskRunSuccessfulExecutionResult = external_exports.object({
  ok: external_exports.literal(true),
  id: external_exports.string(),
  output: external_exports.string().optional(),
  outputType: external_exports.string(),
  usage: TaskRunExecutionUsage.optional(),
  // Optional for now for backwards compatibility
  taskIdentifier: external_exports.string().optional(),
  // This is deprecated, use flushedMetadata instead
  metadata: FlushedRunMetadata.optional(),
  // This is the new way to flush metadata
  flushedMetadata: external_exports.object({
    data: external_exports.string().optional(),
    dataType: external_exports.string()
  }).optional()
});
var TaskRunExecutionResult = external_exports.discriminatedUnion("ok", [
  TaskRunSuccessfulExecutionResult,
  TaskRunFailedExecutionResult
]);
var BatchTaskRunExecutionResult = external_exports.object({
  id: external_exports.string(),
  items: TaskRunExecutionResult.array()
});
var WaitpointTokenResult = external_exports.object({
  ok: external_exports.boolean(),
  output: external_exports.string().optional(),
  outputType: external_exports.string().optional()
});
var SerializedError = external_exports.object({
  message: external_exports.string(),
  name: external_exports.string().optional(),
  stackTrace: external_exports.string().optional()
});
var RuntimeEnvironmentType = {
  PRODUCTION: "PRODUCTION",
  STAGING: "STAGING",
  DEVELOPMENT: "DEVELOPMENT",
  PREVIEW: "PREVIEW"
};
var RuntimeEnvironmentTypeSchema = external_exports.enum(Object.values(RuntimeEnvironmentType));

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/schemas.js
var EnvironmentType = external_exports.enum(["PRODUCTION", "STAGING", "DEVELOPMENT", "PREVIEW"]);
var RunEngineVersionSchema = external_exports.enum(["V1", "V2"]);
var TaskRunExecutionMetric = external_exports.object({
  name: external_exports.string(),
  event: external_exports.string(),
  timestamp: external_exports.number(),
  duration: external_exports.number()
});
var TaskRunExecutionMetrics = external_exports.array(TaskRunExecutionMetric);
var TaskRunExecutionPayload = external_exports.object({
  execution: TaskRunExecution,
  traceContext: external_exports.record(external_exports.unknown()),
  environment: external_exports.record(external_exports.string()).optional(),
  metrics: TaskRunExecutionMetrics.optional()
});
var V3ProdTaskRunExecution = V3TaskRunExecution.extend({
  worker: external_exports.object({
    id: external_exports.string(),
    contentHash: external_exports.string(),
    version: external_exports.string(),
    type: RunEngineVersionSchema.optional()
  }),
  machine: MachinePreset.default({ name: "small-1x", cpu: 1, memory: 1, centsPerMs: 0 })
});
var V3ProdTaskRunExecutionPayload = external_exports.object({
  execution: V3ProdTaskRunExecution,
  traceContext: external_exports.record(external_exports.unknown()),
  environment: external_exports.record(external_exports.string()).optional(),
  metrics: TaskRunExecutionMetrics.optional()
});
var FixedWindowRateLimit = external_exports.object({
  type: external_exports.literal("fixed-window"),
  limit: external_exports.number(),
  window: external_exports.union([
    external_exports.object({
      seconds: external_exports.number()
    }),
    external_exports.object({
      minutes: external_exports.number()
    }),
    external_exports.object({
      hours: external_exports.number()
    })
  ])
});
var SlidingWindowRateLimit = external_exports.object({
  type: external_exports.literal("sliding-window"),
  limit: external_exports.number(),
  window: external_exports.union([
    external_exports.object({
      seconds: external_exports.number()
    }),
    external_exports.object({
      minutes: external_exports.number()
    }),
    external_exports.object({
      hours: external_exports.number()
    })
  ])
});
var RateLimitOptions = external_exports.discriminatedUnion("type", [
  FixedWindowRateLimit,
  SlidingWindowRateLimit
]);
var RetryOptions = external_exports.object({
  /** The number of attempts before giving up */
  maxAttempts: external_exports.number().int().optional(),
  /** The exponential factor to use when calculating the next retry time.
   *
   * Each subsequent retry will be calculated as `previousTimeout * factor`
   */
  factor: external_exports.number().optional(),
  /** The minimum time to wait before retrying */
  minTimeoutInMs: external_exports.number().int().optional(),
  /** The maximum time to wait before retrying */
  maxTimeoutInMs: external_exports.number().int().optional(),
  /** Randomize the timeout between retries.
   *
   * This can be useful to prevent the thundering herd problem where all retries happen at the same time.
   */
  randomize: external_exports.boolean().optional(),
  /** If a run fails with an Out Of Memory (OOM) error and you have this set, it will retry with the machine you specify.
   * Note: it will not default to this [machine](https://trigger.dev/docs/machines) for new runs, only for failures caused by OOM errors.
   * So if you frequently have attempts failing with OOM errors, you should set the [default machine](https://trigger.dev/docs/machines) to be higher.
   */
  outOfMemory: external_exports.object({
    machine: MachinePresetName.optional()
  }).optional()
});
var QueueManifest = external_exports.object({
  /** You can define a shared queue and then pass the name in to your task.
     *
     * @example
     *
     * ```ts
     * const myQueue = queue({
        name: "my-queue",
        concurrencyLimit: 1,
      });
  
      export const task1 = task({
        id: "task-1",
        queue: {
          name: "my-queue",
        },
        run: async (payload: { message: string }) => {
          // ...
        },
      });
  
      export const task2 = task({
        id: "task-2",
        queue: {
          name: "my-queue",
        },
        run: async (payload: { message: string }) => {
          // ...
        },
      });
     * ```
     */
  name: external_exports.string(),
  /** An optional property that specifies the maximum number of concurrent run executions.
   *
   * If this property is omitted, the task can potentially use up the full concurrency of an environment */
  concurrencyLimit: external_exports.number().int().min(0).max(1e5).optional().nullable()
});
var ScheduleMetadata = external_exports.object({
  cron: external_exports.string(),
  timezone: external_exports.string(),
  environments: external_exports.array(EnvironmentType).optional()
});
var taskMetadata = {
  id: external_exports.string(),
  description: external_exports.string().optional(),
  queue: QueueManifest.extend({ name: external_exports.string().optional() }).optional(),
  retry: RetryOptions.optional(),
  machine: MachineConfig.optional(),
  triggerSource: external_exports.string().optional(),
  schedule: ScheduleMetadata.optional(),
  maxDuration: external_exports.number().optional(),
  payloadSchema: external_exports.unknown().optional()
};
var TaskMetadata = external_exports.object(taskMetadata);
var TaskFile = external_exports.object({
  entry: external_exports.string(),
  out: external_exports.string()
});
var taskFileMetadata = {
  filePath: external_exports.string(),
  exportName: external_exports.string().optional(),
  entryPoint: external_exports.string()
};
var TaskFileMetadata = external_exports.object(taskFileMetadata);
var TaskManifest = external_exports.object({
  ...taskMetadata,
  ...taskFileMetadata
});
var PostStartCauses = external_exports.enum(["index", "create", "restore"]);
var PreStopCauses = external_exports.enum(["terminate"]);
var RegexSchema = external_exports.custom((val) => {
  try {
    return typeof val.test === "function";
  } catch {
    return false;
  }
});
var Config = external_exports.object({
  project: external_exports.string(),
  triggerDirectories: external_exports.string().array().optional(),
  triggerUrl: external_exports.string().optional(),
  projectDir: external_exports.string().optional(),
  tsconfigPath: external_exports.string().optional(),
  retries: external_exports.object({
    enabledInDev: external_exports.boolean().default(true),
    default: RetryOptions.optional()
  }).optional(),
  additionalPackages: external_exports.string().array().optional(),
  additionalFiles: external_exports.string().array().optional(),
  dependenciesToBundle: external_exports.array(external_exports.union([external_exports.string(), RegexSchema])).optional(),
  logLevel: external_exports.string().optional(),
  enableConsoleLogging: external_exports.boolean().optional(),
  postInstall: external_exports.string().optional(),
  extraCACerts: external_exports.string().optional()
});
var WaitReason = external_exports.enum(["WAIT_FOR_DURATION", "WAIT_FOR_TASK", "WAIT_FOR_BATCH"]);
var TaskRunExecutionLazyAttemptPayload = external_exports.object({
  runId: external_exports.string(),
  attemptCount: external_exports.number().optional(),
  messageId: external_exports.string(),
  isTest: external_exports.boolean(),
  traceContext: external_exports.record(external_exports.unknown()),
  environment: external_exports.record(external_exports.string()).optional(),
  metrics: TaskRunExecutionMetrics.optional()
});
var ManualCheckpointMetadata = external_exports.object({
  /** NOT a friendly ID */
  attemptId: external_exports.string(),
  previousRunStatus: external_exports.string(),
  previousAttemptStatus: external_exports.string()
});
var RunChainState = external_exports.object({
  concurrency: external_exports.object({
    queues: external_exports.array(external_exports.object({ id: external_exports.string(), name: external_exports.string(), holding: external_exports.number() })),
    environment: external_exports.number().optional()
  }).optional()
});
var TriggerTraceContext = external_exports.object({
  traceparent: external_exports.string().optional(),
  tracestate: external_exports.string().optional(),
  external: external_exports.object({
    traceparent: external_exports.string().optional(),
    tracestate: external_exports.string().optional()
  }).optional()
});

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/resources.js
var TaskResource = external_exports.object({
  id: external_exports.string(),
  description: external_exports.string().optional(),
  filePath: external_exports.string(),
  exportName: external_exports.string().optional(),
  queue: QueueManifest.extend({ name: external_exports.string().optional() }).optional(),
  retry: RetryOptions.optional(),
  machine: MachineConfig.optional(),
  triggerSource: external_exports.string().optional(),
  schedule: ScheduleMetadata.optional(),
  maxDuration: external_exports.number().optional(),
  // JSONSchema type - using z.unknown() for runtime validation to accept JSONSchema7
  payloadSchema: external_exports.unknown().optional()
});
var BackgroundWorkerSourceFileMetadata = external_exports.object({
  filePath: external_exports.string(),
  contents: external_exports.string(),
  contentHash: external_exports.string(),
  taskIds: external_exports.array(external_exports.string())
});
var BackgroundWorkerMetadata = external_exports.object({
  packageVersion: external_exports.string(),
  contentHash: external_exports.string(),
  cliPackageVersion: external_exports.string().optional(),
  tasks: external_exports.array(TaskResource),
  queues: external_exports.array(QueueManifest).optional(),
  sourceFiles: external_exports.array(BackgroundWorkerSourceFileMetadata).optional(),
  runtime: external_exports.string().optional(),
  runtimeVersion: external_exports.string().optional()
});
var ImageDetailsMetadata = external_exports.object({
  contentHash: external_exports.string(),
  imageTag: external_exports.string()
});

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/runEngine.js
var TaskRunExecutionStatus = {
  RUN_CREATED: "RUN_CREATED",
  QUEUED: "QUEUED",
  QUEUED_EXECUTING: "QUEUED_EXECUTING",
  PENDING_EXECUTING: "PENDING_EXECUTING",
  EXECUTING: "EXECUTING",
  EXECUTING_WITH_WAITPOINTS: "EXECUTING_WITH_WAITPOINTS",
  SUSPENDED: "SUSPENDED",
  PENDING_CANCEL: "PENDING_CANCEL",
  FINISHED: "FINISHED",
  DELAYED: "DELAYED"
};
var TaskRunStatus = {
  DELAYED: "DELAYED",
  PENDING: "PENDING",
  PENDING_VERSION: "PENDING_VERSION",
  WAITING_FOR_DEPLOY: "WAITING_FOR_DEPLOY",
  DEQUEUED: "DEQUEUED",
  EXECUTING: "EXECUTING",
  WAITING_TO_RESUME: "WAITING_TO_RESUME",
  RETRYING_AFTER_FAILURE: "RETRYING_AFTER_FAILURE",
  PAUSED: "PAUSED",
  CANCELED: "CANCELED",
  INTERRUPTED: "INTERRUPTED",
  COMPLETED_SUCCESSFULLY: "COMPLETED_SUCCESSFULLY",
  COMPLETED_WITH_ERRORS: "COMPLETED_WITH_ERRORS",
  SYSTEM_FAILURE: "SYSTEM_FAILURE",
  CRASHED: "CRASHED",
  EXPIRED: "EXPIRED",
  TIMED_OUT: "TIMED_OUT"
};
var WaitpointType = {
  RUN: "RUN",
  DATETIME: "DATETIME",
  MANUAL: "MANUAL",
  BATCH: "BATCH"
};
var WaitpointStatusValues = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED"
};
var WaitpointStatus = external_exports.enum(Object.values(WaitpointStatusValues));
var CompletedWaitpoint = external_exports.object({
  id: external_exports.string(),
  index: external_exports.number().optional(),
  friendlyId: external_exports.string(),
  type: external_exports.enum(Object.values(WaitpointType)),
  completedAt: external_exports.coerce.date(),
  idempotencyKey: external_exports.string().optional(),
  /** For type === "RUN" */
  completedByTaskRun: external_exports.object({
    id: external_exports.string(),
    friendlyId: external_exports.string(),
    /** If the run has an associated batch */
    batch: external_exports.object({
      id: external_exports.string(),
      friendlyId: external_exports.string()
    }).optional()
  }).optional(),
  /** For type === "DATETIME" */
  completedAfter: external_exports.coerce.date().optional(),
  /** For type === "BATCH" */
  completedByBatch: external_exports.object({
    id: external_exports.string(),
    friendlyId: external_exports.string()
  }).optional(),
  output: external_exports.string().optional(),
  outputType: external_exports.string().optional(),
  outputIsError: external_exports.boolean()
});
var ExecutionSnapshot = external_exports.object({
  id: external_exports.string(),
  friendlyId: external_exports.string(),
  executionStatus: external_exports.enum(Object.values(TaskRunExecutionStatus)),
  description: external_exports.string(),
  createdAt: external_exports.coerce.date()
});
var BaseRunMetadata = external_exports.object({
  id: external_exports.string(),
  friendlyId: external_exports.string(),
  status: external_exports.enum(Object.values(TaskRunStatus)),
  attemptNumber: external_exports.number().nullish(),
  taskEventStore: external_exports.string().optional()
});
var ExecutionResult = external_exports.object({
  snapshot: ExecutionSnapshot,
  run: BaseRunMetadata
});
var StartRunAttemptResult = ExecutionResult.and(external_exports.object({
  execution: TaskRunExecution
}));
var CompleteAttemptStatus = external_exports.enum([
  "RUN_FINISHED",
  "RUN_PENDING_CANCEL",
  "RETRY_QUEUED",
  "RETRY_IMMEDIATELY"
]);
var CompleteRunAttemptResult = external_exports.object({
  attemptStatus: CompleteAttemptStatus
}).and(ExecutionResult);
var CheckpointTypeEnum = {
  DOCKER: "DOCKER",
  KUBERNETES: "KUBERNETES"
};
var CheckpointType = external_exports.enum(Object.values(CheckpointTypeEnum));
var CheckpointInput = external_exports.object({
  type: CheckpointType,
  location: external_exports.string(),
  imageRef: external_exports.string().nullish(),
  reason: external_exports.string().nullish()
});
var TaskRunCheckpoint = CheckpointInput.merge(external_exports.object({
  id: external_exports.string(),
  friendlyId: external_exports.string()
}));
var RunExecutionData = external_exports.object({
  version: external_exports.literal("1"),
  snapshot: ExecutionSnapshot,
  run: BaseRunMetadata,
  batch: external_exports.object({
    id: external_exports.string(),
    friendlyId: external_exports.string()
  }).optional(),
  checkpoint: TaskRunCheckpoint.optional(),
  completedWaitpoints: external_exports.array(CompletedWaitpoint)
});
var CreateCheckpointResult = external_exports.discriminatedUnion("ok", [
  external_exports.object({
    ok: external_exports.literal(true),
    checkpoint: TaskRunCheckpoint
  }).merge(ExecutionResult),
  external_exports.object({
    ok: external_exports.literal(false),
    error: external_exports.string()
  })
]);
var MachineResources = external_exports.object({
  cpu: external_exports.number(),
  memory: external_exports.number()
});
var DequeueMessageCheckpoint = external_exports.object({
  id: external_exports.string(),
  type: CheckpointType,
  location: external_exports.string(),
  imageRef: external_exports.string().nullish(),
  reason: external_exports.string().nullish()
});
var PlacementTag = external_exports.object({
  key: external_exports.string(),
  values: external_exports.array(external_exports.string()).optional()
});
var DequeuedMessage = external_exports.object({
  version: external_exports.literal("1"),
  snapshot: ExecutionSnapshot,
  dequeuedAt: external_exports.coerce.date(),
  workerQueueLength: external_exports.number().optional(),
  image: external_exports.string().optional(),
  checkpoint: DequeueMessageCheckpoint.optional(),
  completedWaitpoints: external_exports.array(CompletedWaitpoint),
  backgroundWorker: external_exports.object({
    id: external_exports.string(),
    friendlyId: external_exports.string(),
    version: external_exports.string()
  }),
  deployment: external_exports.object({
    id: external_exports.string().optional(),
    friendlyId: external_exports.string().optional(),
    imagePlatform: external_exports.string().optional()
  }),
  run: external_exports.object({
    id: external_exports.string(),
    friendlyId: external_exports.string(),
    isTest: external_exports.boolean(),
    machine: MachinePreset,
    attemptNumber: external_exports.number(),
    masterQueue: external_exports.string(),
    traceContext: external_exports.record(external_exports.unknown())
  }),
  environment: external_exports.object({
    id: external_exports.string(),
    type: EnvironmentType
  }),
  organization: external_exports.object({
    id: external_exports.string()
  }),
  project: external_exports.object({
    id: external_exports.string()
  }),
  placementTags: external_exports.array(PlacementTag).optional()
});

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/api.js
var RunEngineVersion = external_exports.union([external_exports.literal("V1"), external_exports.literal("V2")]);
var WhoAmIResponseSchema = external_exports.object({
  userId: external_exports.string(),
  email: external_exports.string().email(),
  dashboardUrl: external_exports.string(),
  project: external_exports.object({
    name: external_exports.string(),
    url: external_exports.string(),
    orgTitle: external_exports.string()
  }).optional()
});
var GetProjectResponseBody = external_exports.object({
  id: external_exports.string(),
  externalRef: external_exports.string().describe("The external reference for the project, also known as the project ref, a unique identifier starting with proj_"),
  name: external_exports.string(),
  slug: external_exports.string(),
  createdAt: external_exports.coerce.date(),
  organization: external_exports.object({
    id: external_exports.string(),
    title: external_exports.string(),
    slug: external_exports.string(),
    createdAt: external_exports.coerce.date()
  })
});
var GetProjectsResponseBody = external_exports.array(GetProjectResponseBody);
var GetOrgsResponseBody = external_exports.array(external_exports.object({
  id: external_exports.string(),
  title: external_exports.string(),
  slug: external_exports.string(),
  createdAt: external_exports.coerce.date()
}));
var CreateProjectRequestBody = external_exports.object({
  name: external_exports.string().trim().min(1, "Name is required").max(255, "Name must be less than 255 characters")
});
var GetProjectEnvResponse = external_exports.object({
  apiKey: external_exports.string(),
  name: external_exports.string(),
  apiUrl: external_exports.string(),
  projectId: external_exports.string()
});
var GetWorkerTaskResponse = external_exports.object({
  id: external_exports.string(),
  slug: external_exports.string(),
  filePath: external_exports.string(),
  triggerSource: external_exports.string(),
  createdAt: external_exports.coerce.date(),
  payloadSchema: external_exports.any().nullish()
});
var GetWorkerByTagResponse = external_exports.object({
  worker: external_exports.object({
    id: external_exports.string(),
    version: external_exports.string(),
    engine: external_exports.string().nullish(),
    sdkVersion: external_exports.string().nullish(),
    cliVersion: external_exports.string().nullish(),
    tasks: external_exports.array(GetWorkerTaskResponse)
  }),
  urls: external_exports.object({
    runs: external_exports.string()
  })
});
var GetJWTRequestBody = external_exports.object({
  claims: external_exports.object({
    scopes: external_exports.array(external_exports.string()).default([])
  }).optional(),
  expirationTime: external_exports.union([external_exports.number(), external_exports.string()]).optional()
});
var GetJWTResponse = external_exports.object({
  token: external_exports.string()
});
var CreateBackgroundWorkerRequestBody = external_exports.object({
  localOnly: external_exports.boolean(),
  metadata: BackgroundWorkerMetadata,
  engine: RunEngineVersion.optional(),
  supportsLazyAttempts: external_exports.boolean().optional(),
  buildPlatform: external_exports.string().optional(),
  targetPlatform: external_exports.string().optional()
});
var CreateBackgroundWorkerResponse = external_exports.object({
  id: external_exports.string(),
  version: external_exports.string(),
  contentHash: external_exports.string()
});
var RunTag = external_exports.string().max(128, "Tags must be less than 128 characters");
var RunTags = external_exports.union([RunTag, RunTag.array()]);
var IdempotencyKeyOptionsSchema = external_exports.object({
  key: external_exports.string(),
  scope: external_exports.enum(["run", "attempt", "global"])
});
var TriggerTaskRequestBody = external_exports.object({
  payload: external_exports.any(),
  context: external_exports.any(),
  options: external_exports.object({
    /** @deprecated engine v1 only */
    dependentAttempt: external_exports.string().optional(),
    /** @deprecated engine v1 only */
    parentAttempt: external_exports.string().optional(),
    /** @deprecated engine v1 only */
    dependentBatch: external_exports.string().optional(),
    /**
     * If triggered in a batch, this is the BatchTaskRun id
     */
    parentBatch: external_exports.string().optional(),
    /**
     * RunEngine v2
     * If triggered inside another run, the parentRunId is the friendly ID of the parent run.
     */
    parentRunId: external_exports.string().optional(),
    /**
     * RunEngine v2
     * Should be `true` if `triggerAndWait` or `batchTriggerAndWait`
     */
    resumeParentOnCompletion: external_exports.boolean().optional(),
    /**
     * Locks the version to the passed value.
     * Automatically set when using `triggerAndWait` or `batchTriggerAndWait`
     */
    lockToVersion: external_exports.string().optional(),
    queue: external_exports.object({
      name: external_exports.string(),
      // @deprecated, this is now specified on the queue
      concurrencyLimit: external_exports.number().int().optional()
    }).optional(),
    concurrencyKey: external_exports.string().optional(),
    delay: external_exports.string().or(external_exports.coerce.date()).optional(),
    idempotencyKey: external_exports.string().optional(),
    idempotencyKeyTTL: external_exports.string().optional(),
    /** The original user-provided idempotency key and scope */
    idempotencyKeyOptions: IdempotencyKeyOptionsSchema.optional(),
    machine: MachinePresetName.optional(),
    maxAttempts: external_exports.number().int().optional(),
    maxDuration: external_exports.number().optional(),
    metadata: external_exports.any(),
    metadataType: external_exports.string().optional(),
    payloadType: external_exports.string().optional(),
    tags: RunTags.optional(),
    test: external_exports.boolean().optional(),
    ttl: external_exports.string().or(external_exports.number().nonnegative().int()).optional(),
    priority: external_exports.number().optional(),
    bulkActionId: external_exports.string().optional(),
    region: external_exports.string().optional(),
    debounce: external_exports.object({
      key: external_exports.string().max(512),
      delay: external_exports.string(),
      mode: external_exports.enum(["leading", "trailing"]).optional()
    }).optional()
  }).optional()
});
var TriggerTaskResponse = external_exports.object({
  id: external_exports.string(),
  isCached: external_exports.boolean().optional()
});
var BatchTriggerTaskRequestBody = external_exports.object({
  items: TriggerTaskRequestBody.array(),
  dependentAttempt: external_exports.string().optional()
});
var BatchTriggerTaskItem = external_exports.object({
  task: external_exports.string(),
  payload: external_exports.any(),
  context: external_exports.any(),
  options: external_exports.object({
    concurrencyKey: external_exports.string().optional(),
    delay: external_exports.string().or(external_exports.coerce.date()).optional(),
    idempotencyKey: external_exports.string().optional(),
    idempotencyKeyTTL: external_exports.string().optional(),
    /** The original user-provided idempotency key and scope */
    idempotencyKeyOptions: IdempotencyKeyOptionsSchema.optional(),
    lockToVersion: external_exports.string().optional(),
    machine: MachinePresetName.optional(),
    maxAttempts: external_exports.number().int().optional(),
    maxDuration: external_exports.number().optional(),
    metadata: external_exports.any(),
    metadataType: external_exports.string().optional(),
    parentAttempt: external_exports.string().optional(),
    payloadType: external_exports.string().optional(),
    queue: external_exports.object({
      name: external_exports.string()
    }).optional(),
    tags: RunTags.optional(),
    test: external_exports.boolean().optional(),
    ttl: external_exports.string().or(external_exports.number().nonnegative().int()).optional(),
    priority: external_exports.number().optional(),
    region: external_exports.string().optional(),
    debounce: external_exports.object({
      key: external_exports.string().max(512),
      delay: external_exports.string(),
      mode: external_exports.enum(["leading", "trailing"]).optional()
    }).optional()
  }).optional()
});
var BatchTriggerTaskV2RequestBody = external_exports.object({
  items: BatchTriggerTaskItem.array(),
  /** @deprecated engine v1 only */
  dependentAttempt: external_exports.string().optional(),
  /**
   * RunEngine v2
   * If triggered inside another run, the parentRunId is the friendly ID of the parent run.
   */
  parentRunId: external_exports.string().optional(),
  /**
   * RunEngine v2
   * Should be `true` if `triggerAndWait` or `batchTriggerAndWait`
   */
  resumeParentOnCompletion: external_exports.boolean().optional()
});
var BatchTriggerTaskV2Response = external_exports.object({
  id: external_exports.string(),
  isCached: external_exports.boolean(),
  idempotencyKey: external_exports.string().optional(),
  runs: external_exports.array(external_exports.object({
    id: external_exports.string(),
    taskIdentifier: external_exports.string(),
    isCached: external_exports.boolean(),
    idempotencyKey: external_exports.string().optional()
  }))
});
var BatchTriggerTaskV3RequestBody = external_exports.object({
  items: BatchTriggerTaskItem.array(),
  /**
   * RunEngine v2
   * If triggered inside another run, the parentRunId is the friendly ID of the parent run.
   */
  parentRunId: external_exports.string().optional(),
  /**
   * RunEngine v2
   * Should be `true` if `triggerAndWait` or `batchTriggerAndWait`
   */
  resumeParentOnCompletion: external_exports.boolean().optional()
});
var BatchTriggerTaskV3Response = external_exports.object({
  id: external_exports.string(),
  runCount: external_exports.number()
});
var CreateBatchRequestBody = external_exports.object({
  /** Expected number of items in the batch */
  runCount: external_exports.number().int().positive(),
  /** Parent run ID for batchTriggerAndWait (friendly ID) */
  parentRunId: external_exports.string().optional(),
  /** Whether to resume parent on completion (true for batchTriggerAndWait) */
  resumeParentOnCompletion: external_exports.boolean().optional(),
  /** Idempotency key for the batch */
  idempotencyKey: external_exports.string().optional(),
  /** The original user-provided idempotency key and scope */
  idempotencyKeyOptions: IdempotencyKeyOptionsSchema.optional()
});
var CreateBatchResponse = external_exports.object({
  /** The batch ID (friendly ID) */
  id: external_exports.string(),
  /** The expected run count */
  runCount: external_exports.number(),
  /** Whether this response came from a cached/idempotent batch */
  isCached: external_exports.boolean(),
  /** The idempotency key if provided */
  idempotencyKey: external_exports.string().optional()
});
var BatchItemNDJSON = external_exports.object({
  /** Zero-based index of this item (used for idempotency and ordering) */
  index: external_exports.number().int().nonnegative(),
  /** The task identifier to trigger */
  task: external_exports.string(),
  /** The payload for this task run */
  payload: external_exports.unknown().optional(),
  /** Options for this specific item */
  options: external_exports.record(external_exports.unknown()).optional()
});
var StreamBatchItemsResponse = external_exports.object({
  /** The batch ID */
  id: external_exports.string(),
  /** Number of items successfully accepted */
  itemsAccepted: external_exports.number(),
  /** Number of items that were deduplicated (already enqueued) */
  itemsDeduplicated: external_exports.number(),
  /** Whether the batch was sealed and is ready for processing.
   * If false, the batch needs more items before processing can start.
   * Clients should check this field and retry with missing items if needed. */
  sealed: external_exports.boolean(),
  /** Total items currently enqueued (only present when sealed=false to help with retries) */
  enqueuedCount: external_exports.number().optional(),
  /** Expected total item count (only present when sealed=false to help with retries) */
  expectedCount: external_exports.number().optional()
});
var BatchTriggerTaskResponse = external_exports.object({
  batchId: external_exports.string(),
  runs: external_exports.string().array()
});
var GetBatchResponseBody = external_exports.object({
  id: external_exports.string(),
  items: external_exports.array(external_exports.object({
    id: external_exports.string(),
    taskRunId: external_exports.string(),
    status: external_exports.enum(["PENDING", "CANCELED", "COMPLETED", "FAILED"])
  }))
});
var AddTagsRequestBody = external_exports.object({
  tags: RunTags
});
var RescheduleRunRequestBody = external_exports.object({
  delay: external_exports.string().or(external_exports.coerce.date())
});
var GetEnvironmentVariablesResponseBody = external_exports.object({
  variables: external_exports.record(external_exports.string())
});
var StartDeploymentIndexingRequestBody = external_exports.object({
  imageReference: external_exports.string(),
  selfHosted: external_exports.boolean().optional()
});
var StartDeploymentIndexingResponseBody = external_exports.object({
  id: external_exports.string(),
  contentHash: external_exports.string()
});
var FinalizeDeploymentRequestBody = external_exports.object({
  skipPromotion: external_exports.boolean().optional(),
  imageDigest: external_exports.string().optional(),
  skipPushToRegistry: external_exports.boolean().optional()
});
var ProgressDeploymentRequestBody = external_exports.object({
  contentHash: external_exports.string().optional(),
  gitMeta: GitMeta.optional(),
  runtime: external_exports.string().optional()
});
var CancelDeploymentRequestBody = external_exports.object({
  reason: external_exports.string().max(200, "Reason must be less than 200 characters").optional()
});
var ExternalBuildData = external_exports.object({
  buildId: external_exports.string(),
  buildToken: external_exports.string(),
  projectId: external_exports.string()
});
var anyString = external_exports.custom((v2) => typeof v2 === "string");
var DeploymentTriggeredVia = external_exports.enum([
  "cli:manual",
  "cli:ci_other",
  "cli:github_actions",
  "cli:gitlab_ci",
  "cli:circleci",
  "cli:jenkins",
  "cli:azure_pipelines",
  "cli:bitbucket_pipelines",
  "cli:travis_ci",
  "cli:buildkite",
  "git_integration:github",
  "dashboard"
]).or(anyString);
var BuildServerMetadata = external_exports.object({
  buildId: external_exports.string().optional(),
  isNativeBuild: external_exports.boolean().optional(),
  artifactKey: external_exports.string().optional(),
  skipPromotion: external_exports.boolean().optional(),
  configFilePath: external_exports.string().optional()
});
var UpsertBranchRequestBody = external_exports.object({
  git: GitMeta.optional(),
  env: external_exports.enum(["preview"]),
  branch: external_exports.string()
});
var UpsertBranchResponseBody = external_exports.object({
  id: external_exports.string()
});
var CreateArtifactRequestBody = external_exports.object({
  type: external_exports.enum(["deployment_context"]).default("deployment_context"),
  contentType: external_exports.string().default("application/gzip"),
  contentLength: external_exports.number().optional()
});
var CreateArtifactResponseBody = external_exports.object({
  artifactKey: external_exports.string(),
  uploadUrl: external_exports.string(),
  uploadFields: external_exports.record(external_exports.string()),
  expiresAt: external_exports.string().datetime()
});
var InitializeDeploymentResponseBody = external_exports.object({
  id: external_exports.string(),
  contentHash: external_exports.string(),
  shortCode: external_exports.string(),
  version: external_exports.string(),
  imageTag: external_exports.string(),
  imagePlatform: external_exports.string(),
  externalBuildData: ExternalBuildData.optional().nullable(),
  eventStream: external_exports.object({
    s2: external_exports.object({
      basin: external_exports.string(),
      stream: external_exports.string(),
      accessToken: external_exports.string()
    })
  }).optional()
});
var InitializeDeploymentRequestBody = external_exports.object({
  contentHash: external_exports.string(),
  userId: external_exports.string().optional(),
  /** @deprecated This is now determined by the webapp. This is only used to warn users with old CLI versions. */
  selfHosted: external_exports.boolean().optional(),
  gitMeta: GitMeta.optional(),
  type: external_exports.enum(["MANAGED", "UNMANAGED", "V1"]).optional(),
  runtime: external_exports.string().optional(),
  initialStatus: external_exports.enum(["PENDING", "BUILDING"]).optional(),
  triggeredVia: DeploymentTriggeredVia.optional(),
  buildId: external_exports.string().optional()
}).and(external_exports.preprocess((val) => {
  const obj = val;
  if (!obj || !obj.isNativeBuild) {
    return { ...obj, isNativeBuild: false };
  }
  return obj;
}, external_exports.discriminatedUnion("isNativeBuild", [
  external_exports.object({
    isNativeBuild: external_exports.literal(true),
    skipPromotion: external_exports.boolean(),
    artifactKey: external_exports.string(),
    configFilePath: external_exports.string().optional()
  }),
  external_exports.object({
    isNativeBuild: external_exports.literal(false)
  })
])));
var RemoteBuildProviderStatusResponseBody = external_exports.object({
  status: external_exports.enum(["operational", "degraded", "unknown"]),
  message: external_exports.string()
});
var GenerateRegistryCredentialsResponseBody = external_exports.object({
  username: external_exports.string(),
  password: external_exports.string(),
  expiresAt: external_exports.string(),
  repositoryUri: external_exports.string()
});
var DeploymentErrorData = external_exports.object({
  name: external_exports.string(),
  message: external_exports.string(),
  stack: external_exports.string().optional(),
  stderr: external_exports.string().optional()
});
var FailDeploymentRequestBody = external_exports.object({
  error: DeploymentErrorData
});
var FailDeploymentResponseBody = external_exports.object({
  id: external_exports.string()
});
var PromoteDeploymentResponseBody = external_exports.object({
  id: external_exports.string(),
  version: external_exports.string(),
  shortCode: external_exports.string()
});
var GetDeploymentResponseBody = external_exports.object({
  id: external_exports.string(),
  status: external_exports.enum([
    "PENDING",
    "INSTALLING",
    "BUILDING",
    "DEPLOYING",
    "DEPLOYED",
    "FAILED",
    "CANCELED",
    "TIMED_OUT"
  ]),
  contentHash: external_exports.string(),
  shortCode: external_exports.string(),
  version: external_exports.string(),
  imageReference: external_exports.string().nullish(),
  imagePlatform: external_exports.string(),
  externalBuildData: ExternalBuildData.optional().nullable(),
  errorData: DeploymentErrorData.nullish(),
  worker: external_exports.object({
    id: external_exports.string(),
    version: external_exports.string(),
    tasks: external_exports.array(external_exports.object({
      id: external_exports.string(),
      slug: external_exports.string(),
      filePath: external_exports.string(),
      exportName: external_exports.string().optional()
    }))
  }).optional()
});
var GetLatestDeploymentResponseBody = GetDeploymentResponseBody.omit({
  worker: true
});
var DeploymentLogEvent = external_exports.object({
  type: external_exports.literal("log"),
  data: external_exports.object({
    level: external_exports.enum(["debug", "info", "warn", "error"]).optional().default("info"),
    message: external_exports.string()
  })
});
var DeploymentFinalizedEvent = external_exports.object({
  type: external_exports.literal("finalized"),
  data: external_exports.object({
    result: external_exports.enum(["succeeded", "failed", "timed_out", "canceled"]).or(anyString),
    message: external_exports.string().optional()
  })
});
var DeploymentEvent = external_exports.discriminatedUnion("type", [
  DeploymentLogEvent,
  DeploymentFinalizedEvent
]);
var DeploymentEventFromString = external_exports.string().transform((s, ctx) => {
  try {
    return JSON.parse(s);
  } catch {
    ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: "Invalid JSON" });
    return external_exports.NEVER;
  }
}).pipe(DeploymentEvent);
var CreateUploadPayloadUrlResponseBody = external_exports.object({
  presignedUrl: external_exports.string()
});
var WorkersListResponseBody = external_exports.object({
  type: external_exports.string(),
  name: external_exports.string(),
  description: external_exports.string().nullish(),
  latestVersion: external_exports.string().nullish(),
  lastHeartbeatAt: external_exports.string().nullish(),
  isDefault: external_exports.boolean(),
  updatedAt: external_exports.coerce.date()
}).array();
var WorkersCreateRequestBody = external_exports.object({
  name: external_exports.string().optional(),
  description: external_exports.string().optional()
});
var WorkersCreateResponseBody = external_exports.object({
  workerGroup: external_exports.object({
    name: external_exports.string(),
    description: external_exports.string().nullish()
  }),
  token: external_exports.object({
    plaintext: external_exports.string()
  })
});
var DevConfigResponseBody = external_exports.object({
  environmentId: external_exports.string(),
  dequeueIntervalWithRun: external_exports.number(),
  dequeueIntervalWithoutRun: external_exports.number(),
  maxConcurrentRuns: external_exports.number(),
  engineUrl: external_exports.string()
});
var DevDequeueRequestBody = external_exports.object({
  currentWorker: external_exports.string(),
  oldWorkers: external_exports.string().array(),
  maxResources: MachineResources.optional()
});
var DevDequeueResponseBody = external_exports.object({
  dequeuedMessages: DequeuedMessage.array()
});
var ReplayRunResponse = external_exports.object({
  id: external_exports.string()
});
var CanceledRunResponse = external_exports.object({
  id: external_exports.string()
});
var ResetIdempotencyKeyResponse = external_exports.object({
  id: external_exports.string()
});
var ScheduleType = external_exports.union([external_exports.literal("DECLARATIVE"), external_exports.literal("IMPERATIVE")]);
var ScheduledTaskPayload = external_exports.object({
  /** The schedule id associated with this run (you can have many schedules for the same task).
    You can use this to remove the schedule, update it, etc */
  scheduleId: external_exports.string(),
  /** The type of schedule – `"DECLARATIVE"` or `"IMPERATIVE"`.
   *
   * **DECLARATIVE** – defined inline on your `schedules.task` using the `cron` property. They can only be created, updated or deleted by modifying the `cron` property on your task.
   *
   * **IMPERATIVE** – created using the `schedules.create` functions or in the dashboard.
   */
  type: ScheduleType,
  /** When the task was scheduled to run.
   * Note this will be slightly different from `new Date()` because it takes a few ms to run the task.
   *
   * This date is UTC. To output it as a string with a timezone you would do this:
   * ```ts
   * const formatted = payload.timestamp.toLocaleString("en-US", {
        timeZone: payload.timezone,
    });
    ```  */
  timestamp: external_exports.date(),
  /** When the task was last run (it has been).
    This can be undefined if it's never been run. This date is UTC. */
  lastTimestamp: external_exports.date().optional(),
  /** You can optionally provide an external id when creating the schedule.
    Usually you would use a userId or some other unique identifier.
    This defaults to undefined if you didn't provide one. */
  externalId: external_exports.string().optional(),
  /** The IANA timezone the schedule is set to. The default is UTC.
   * You can see the full list of supported timezones here: https://cloud.trigger.dev/timezones
   */
  timezone: external_exports.string(),
  /** The next 5 dates this task is scheduled to run */
  upcoming: external_exports.array(external_exports.date())
});
var CreateScheduleOptions = external_exports.object({
  /** The id of the task you want to attach to. */
  task: external_exports.string(),
  /**  The schedule in CRON format.
     *
     * ```txt
  *    *    *    *    *    *
  ┬    ┬    ┬    ┬    ┬
  │    │    │    │    |
  │    │    │    │    └ day of week (0 - 7, 1L - 7L) (0 or 7 is Sun)
  │    │    │    └───── month (1 - 12)
  │    │    └────────── day of month (1 - 31, L)
  │    └─────────────── hour (0 - 23)
  └──────────────────── minute (0 - 59)
     * ```
  
  "L" means the last. In the "day of week" field, 1L means the last Monday of the month. In the day of month field, L means the last day of the month.
  
     */
  cron: external_exports.string(),
  /** You can only create one schedule with this key. If you use it twice, the second call will update the schedule.
   *
   * This is required to prevent you from creating duplicate schedules. */
  deduplicationKey: external_exports.string(),
  /** Optionally, you can specify your own IDs (like a user ID) and then use it inside the run function of your task.
   *
   * This allows you to have per-user CRON tasks.
   */
  externalId: external_exports.string().optional(),
  /** Optionally, you can specify a timezone in the IANA format. If unset it will use UTC.
   * If specified then the CRON will be evaluated in that timezone and will respect daylight savings.
   *
   * If you set the CRON to `0 0 * * *` and the timezone to `America/New_York` then the task will run at midnight in New York time, no matter whether it's daylight savings or not.
   *
   * You can see the full list of supported timezones here: https://cloud.trigger.dev/timezones
   *
   * @example "America/New_York", "Europe/London", "Asia/Tokyo", "Africa/Cairo"
   *
   */
  timezone: external_exports.string().optional()
});
var UpdateScheduleOptions = CreateScheduleOptions.omit({ deduplicationKey: true });
var ScheduleGenerator = external_exports.object({
  type: external_exports.literal("CRON"),
  expression: external_exports.string(),
  description: external_exports.string()
});
var ScheduleObject = external_exports.object({
  id: external_exports.string(),
  type: ScheduleType,
  task: external_exports.string(),
  active: external_exports.boolean(),
  deduplicationKey: external_exports.string().nullish(),
  externalId: external_exports.string().nullish(),
  generator: ScheduleGenerator,
  timezone: external_exports.string(),
  nextRun: external_exports.coerce.date().nullish(),
  environments: external_exports.array(external_exports.object({
    id: external_exports.string(),
    type: external_exports.string(),
    userName: external_exports.string().nullish()
  }))
});
var DeletedScheduleObject = external_exports.object({
  id: external_exports.string()
});
var ListSchedulesResult = external_exports.object({
  data: external_exports.array(ScheduleObject),
  pagination: external_exports.object({
    currentPage: external_exports.number(),
    totalPages: external_exports.number(),
    count: external_exports.number()
  })
});
var ListScheduleOptions = external_exports.object({
  page: external_exports.number().optional(),
  perPage: external_exports.number().optional()
});
var TimezonesResult = external_exports.object({
  timezones: external_exports.array(external_exports.string())
});
var RunStatus = external_exports.enum([
  /// Task is waiting for a version update because it cannot execute without additional information (task, queue, etc.)
  "PENDING_VERSION",
  /// Task is waiting to be executed by a worker
  "QUEUED",
  /// Task is waiting to be executed by a worker
  "DEQUEUED",
  /// Task is currently being executed by a worker
  "EXECUTING",
  /// Task has been paused by the system, and will be resumed by the system
  "WAITING",
  /// Task has been completed successfully
  "COMPLETED",
  /// Task has been canceled by the user
  "CANCELED",
  /// Task has been completed with errors
  "FAILED",
  /// Task has crashed and won't be retried, most likely the worker ran out of resources, e.g. memory or storage
  "CRASHED",
  /// Task has failed to complete, due to an error in the system
  "SYSTEM_FAILURE",
  /// Task has been scheduled to run at a specific time
  "DELAYED",
  /// Task has expired and won't be executed
  "EXPIRED",
  /// Task has reached it's maxDuration and has been stopped
  "TIMED_OUT"
]);
var AttemptStatus = external_exports.enum([
  "PENDING",
  "EXECUTING",
  "PAUSED",
  "COMPLETED",
  "FAILED",
  "CANCELED"
]);
var RunEnvironmentDetails = external_exports.object({
  id: external_exports.string(),
  name: external_exports.string(),
  user: external_exports.string().optional()
});
var RunScheduleDetails = external_exports.object({
  id: external_exports.string(),
  externalId: external_exports.string().optional(),
  deduplicationKey: external_exports.string().optional(),
  generator: ScheduleGenerator
});
var TriggerFunction = external_exports.enum([
  "triggerAndWait",
  "trigger",
  "batchTriggerAndWait",
  "batchTrigger"
]);
var CommonRunFields = {
  id: external_exports.string(),
  status: RunStatus,
  taskIdentifier: external_exports.string(),
  idempotencyKey: external_exports.string().optional(),
  version: external_exports.string().optional(),
  isQueued: external_exports.boolean(),
  isExecuting: external_exports.boolean(),
  isWaiting: external_exports.boolean(),
  isCompleted: external_exports.boolean(),
  isSuccess: external_exports.boolean(),
  isFailed: external_exports.boolean(),
  isCancelled: external_exports.boolean(),
  isTest: external_exports.boolean(),
  createdAt: external_exports.coerce.date(),
  updatedAt: external_exports.coerce.date(),
  startedAt: external_exports.coerce.date().optional(),
  finishedAt: external_exports.coerce.date().optional(),
  delayedUntil: external_exports.coerce.date().optional(),
  ttl: external_exports.string().optional(),
  expiredAt: external_exports.coerce.date().optional(),
  tags: external_exports.string().array(),
  costInCents: external_exports.number(),
  baseCostInCents: external_exports.number(),
  durationMs: external_exports.number(),
  metadata: external_exports.record(external_exports.any()).optional()
};
var RetrieveRunCommandFields = {
  ...CommonRunFields,
  depth: external_exports.number(),
  triggerFunction: external_exports.enum(["triggerAndWait", "trigger", "batchTriggerAndWait", "batchTrigger"]),
  batchId: external_exports.string().optional()
};
var RelatedRunDetails = external_exports.object(RetrieveRunCommandFields);
var RetrieveRunResponse = external_exports.object({
  ...RetrieveRunCommandFields,
  payload: external_exports.any().optional(),
  payloadPresignedUrl: external_exports.string().optional(),
  output: external_exports.any().optional(),
  outputPresignedUrl: external_exports.string().optional(),
  error: SerializedError.optional(),
  schedule: RunScheduleDetails.optional(),
  relatedRuns: external_exports.object({
    root: RelatedRunDetails.optional(),
    parent: RelatedRunDetails.optional(),
    children: external_exports.array(RelatedRunDetails).optional()
  }),
  attemptCount: external_exports.number().default(0)
});
var ListRunResponseItem = external_exports.object({
  ...CommonRunFields,
  env: RunEnvironmentDetails
});
var ListRunResponse = external_exports.object({
  data: external_exports.array(ListRunResponseItem),
  pagination: external_exports.object({
    next: external_exports.string().optional(),
    previous: external_exports.string().optional()
  })
});
var CreateEnvironmentVariableRequestBody = external_exports.object({
  name: external_exports.string(),
  value: external_exports.string()
});
var UpdateEnvironmentVariableRequestBody = external_exports.object({
  value: external_exports.string()
});
var ImportEnvironmentVariablesRequestBody = external_exports.object({
  variables: external_exports.record(external_exports.string()),
  parentVariables: external_exports.record(external_exports.string()).optional(),
  override: external_exports.boolean().optional()
});
var EnvironmentVariableResponseBody = external_exports.object({
  success: external_exports.boolean()
});
var EnvironmentVariableValue = external_exports.object({
  value: external_exports.string()
});
var EnvironmentVariable = external_exports.object({
  name: external_exports.string(),
  value: external_exports.string()
});
var EnvironmentVariables = external_exports.array(EnvironmentVariable);
var EnvironmentVariableWithSecret = external_exports.object({
  /** The name of the env var, e.g. `DATABASE_URL` */
  name: external_exports.string(),
  /** The value of the env var. If it's a secret, this will be a redacted value, not the real value.  */
  value: external_exports.string(),
  /**
   * Whether the env var is a secret or not.
   * When you create env vars you can mark them as secrets.
   *
   * You can't view the value of a secret env var after setting it initially.
   * For a secret env var, the value will be redacted.
   */
  isSecret: external_exports.boolean()
});
var UpdateMetadataResponseBody = external_exports.object({
  metadata: external_exports.record(DeserializedJsonSchema)
});
var RawShapeDate = external_exports.string().transform((val) => `${val}Z`).pipe(external_exports.coerce.date());
var RawOptionalShapeDate = external_exports.string().nullish().transform((val) => val ? /* @__PURE__ */ new Date(`${val}Z`) : val);
var SubscribeRunRawShape = external_exports.object({
  id: external_exports.string(),
  taskIdentifier: external_exports.string(),
  friendlyId: external_exports.string(),
  status: external_exports.string(),
  createdAt: RawShapeDate,
  updatedAt: RawShapeDate,
  startedAt: RawOptionalShapeDate,
  delayUntil: RawOptionalShapeDate,
  queuedAt: RawOptionalShapeDate,
  expiredAt: RawOptionalShapeDate,
  completedAt: RawOptionalShapeDate,
  idempotencyKey: external_exports.string().nullish(),
  number: external_exports.number().default(0),
  isTest: external_exports.boolean().default(false),
  usageDurationMs: external_exports.number().default(0),
  costInCents: external_exports.number().default(0),
  baseCostInCents: external_exports.number().default(0),
  ttl: external_exports.string().nullish(),
  payload: external_exports.string().nullish(),
  payloadType: external_exports.string().nullish(),
  metadata: external_exports.string().nullish(),
  metadataType: external_exports.string().nullish(),
  output: external_exports.string().nullish(),
  outputType: external_exports.string().nullish(),
  runTags: external_exports.array(external_exports.string()).nullish().default([]),
  error: TaskRunError.nullish(),
  realtimeStreams: external_exports.array(external_exports.string()).nullish().default([])
});
var BatchStatus = external_exports.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "PARTIAL_FAILED",
  "ABORTED"
]);
var RetrieveBatchResponse = external_exports.object({
  id: external_exports.string(),
  status: BatchStatus,
  idempotencyKey: external_exports.string().optional(),
  createdAt: external_exports.coerce.date(),
  updatedAt: external_exports.coerce.date(),
  runCount: external_exports.number(),
  runs: external_exports.array(external_exports.string())
});
var RetrieveBatchV2Response = external_exports.object({
  id: external_exports.string(),
  status: BatchStatus,
  idempotencyKey: external_exports.string().optional(),
  createdAt: external_exports.coerce.date(),
  updatedAt: external_exports.coerce.date(),
  runCount: external_exports.number(),
  runs: external_exports.array(external_exports.string()),
  processing: external_exports.object({
    completedAt: external_exports.coerce.date().optional(),
    errors: external_exports.array(external_exports.object({
      index: external_exports.number(),
      taskIdentifier: external_exports.string(),
      error: external_exports.string(),
      errorCode: external_exports.string().optional()
    }))
  })
});
var SubscribeRealtimeStreamChunkRawShape = external_exports.object({
  id: external_exports.string(),
  runId: external_exports.string(),
  sequence: external_exports.number(),
  key: external_exports.string(),
  value: external_exports.string(),
  createdAt: external_exports.coerce.date()
});
var TimePeriod = external_exports.string().or(external_exports.coerce.date());
var CreateWaitpointTokenRequestBody = external_exports.object({
  /**
   * An optional idempotency key for the waitpoint.
   * If you use the same key twice (and the key hasn't expired), you will get the original waitpoint back.
   *
   * Note: This waitpoint may already be complete, in which case when you wait for it, it will immediately continue.
   */
  idempotencyKey: external_exports.string().optional(),
  /**
   * When set, this means the passed in idempotency key will expire after this time.
   * This means after that time if you pass the same idempotency key again, you will get a new waitpoint.
   */
  idempotencyKeyTTL: external_exports.string().optional(),
  /** The resume token will timeout after this time.
   * If you are waiting for the token in a run, the token will return a result where `ok` is false.
   *
   * You can pass a `Date` object, or a string in this format: "30s", "1m", "2h", "3d", "4w".
   */
  timeout: TimePeriod.optional(),
  /**
   * Tags to attach to the waitpoint. Tags can be used to filter waitpoints in the dashboard.
   *
   * You can set up to 10 tags per waitpoint, they must be less than 128 characters each.
   *
   * We recommend prefixing tags with a namespace using an underscore or colon, like `user_1234567` or `org:9876543`.
   *
   * @example
   *
   * ```ts
   * await wait.createToken({ tags: ["user:1234567", "org:9876543"] });
   * ```
   */
  tags: RunTags.optional()
});
var CreateWaitpointTokenResponseBody = external_exports.object({
  id: external_exports.string(),
  isCached: external_exports.boolean(),
  url: external_exports.string()
});
var waitpointTokenStatuses = ["WAITING", "COMPLETED", "TIMED_OUT"];
var WaitpointTokenStatus = external_exports.enum(waitpointTokenStatuses);
var WaitpointTokenItem = external_exports.object({
  id: external_exports.string(),
  /** If you make a POST request to this URL, it will complete the waitpoint. */
  url: external_exports.string(),
  status: WaitpointTokenStatus,
  completedAt: external_exports.coerce.date().optional(),
  completedAfter: external_exports.coerce.date().optional(),
  timeoutAt: external_exports.coerce.date().optional(),
  idempotencyKey: external_exports.string().optional(),
  idempotencyKeyExpiresAt: external_exports.coerce.date().optional(),
  tags: external_exports.array(external_exports.string()),
  createdAt: external_exports.coerce.date()
});
var WaitpointListTokenItem = WaitpointTokenItem.omit({
  completedAfter: true
});
var WaitpointRetrieveTokenResponse = WaitpointListTokenItem.and(external_exports.object({
  output: external_exports.string().optional(),
  outputType: external_exports.string().optional(),
  outputIsError: external_exports.boolean().optional()
}));
var CompleteWaitpointTokenRequestBody = external_exports.object({
  data: external_exports.any().nullish()
});
var CompleteWaitpointTokenResponseBody = external_exports.object({
  success: external_exports.literal(true)
});
var WaitForWaitpointTokenResponseBody = external_exports.object({
  success: external_exports.boolean()
});
var WaitForDurationRequestBody = external_exports.object({
  /**
   * An optional idempotency key for the waitpoint.
   * If you use the same key twice (and the key hasn't expired), you will get the original waitpoint back.
   *
   * Note: This waitpoint may already be complete, in which case when you wait for it, it will immediately continue.
   */
  idempotencyKey: external_exports.string().optional(),
  /**
   * When set, this means the passed in idempotency key will expire after this time.
   * This means after that time if you pass the same idempotency key again, you will get a new waitpoint.
   */
  idempotencyKeyTTL: external_exports.string().optional(),
  /**
   * The date that the waitpoint will complete.
   */
  date: external_exports.coerce.date()
});
var WaitForDurationResponseBody = external_exports.object({
  /**
      If you pass an idempotencyKey, you may actually not need to wait.
      Use this date to determine when to continue.
  */
  waitUntil: external_exports.coerce.date(),
  waitpoint: external_exports.object({
    id: external_exports.string()
  })
});
var ApiDeploymentCommonShape = {
  from: external_exports.string().describe("The date to start the search from, in ISO 8601 format").optional(),
  to: external_exports.string().describe("The date to end the search, in ISO 8601 format").optional(),
  period: external_exports.string().describe("The period to search within (e.g. 1d, 7d, 3h, etc.)").optional(),
  status: external_exports.enum(["PENDING", "BUILDING", "DEPLOYING", "DEPLOYED", "FAILED", "CANCELED", "TIMED_OUT"]).describe("Filter deployments that are in this status").optional()
};
var ApiDeploymentListPaginationCursor = external_exports.string().describe("The deployment ID to start the search from, to get the next page").optional();
var ApiDeploymentListPaginationLimit = external_exports.coerce.number().describe("The number of deployments to return, defaults to 20 (max 100)").min(1, "Limit must be at least 1").max(100, "Limit must be less than 100").optional();
var ApiDeploymentListParams = {
  ...ApiDeploymentCommonShape,
  cursor: ApiDeploymentListPaginationCursor,
  limit: ApiDeploymentListPaginationLimit
};
var ApiDeploymentListOptions = external_exports.object(ApiDeploymentListParams);
var ApiDeploymentListSearchParams = external_exports.object({
  ...ApiDeploymentCommonShape,
  "page[after]": ApiDeploymentListPaginationCursor,
  "page[size]": ApiDeploymentListPaginationLimit
});
var ApiDeploymentListResponseItem = external_exports.object({
  id: external_exports.string(),
  createdAt: external_exports.coerce.date(),
  shortCode: external_exports.string(),
  version: external_exports.string(),
  runtime: external_exports.string(),
  runtimeVersion: external_exports.string(),
  status: external_exports.enum([
    "PENDING",
    "BUILDING",
    "DEPLOYING",
    "DEPLOYED",
    "FAILED",
    "CANCELED",
    "TIMED_OUT"
  ]),
  deployedAt: external_exports.coerce.date().optional(),
  git: external_exports.record(external_exports.any()).optional(),
  error: DeploymentErrorData.optional()
});
var ApiBranchListResponseBody = external_exports.object({
  branches: external_exports.array(external_exports.object({
    id: external_exports.string(),
    name: external_exports.string(),
    createdAt: external_exports.coerce.date(),
    updatedAt: external_exports.coerce.date(),
    git: external_exports.record(external_exports.any()).optional(),
    isPaused: external_exports.boolean()
  }))
});
var RetrieveRunTraceSpanSchema = external_exports.object({
  id: external_exports.string(),
  parentId: external_exports.string().optional(),
  runId: external_exports.string(),
  data: external_exports.object({
    message: external_exports.string(),
    taskSlug: external_exports.string().optional(),
    taskPath: external_exports.string().optional(),
    events: external_exports.array(external_exports.any()).optional(),
    startTime: external_exports.coerce.date(),
    duration: external_exports.number(),
    isError: external_exports.boolean(),
    isPartial: external_exports.boolean(),
    isCancelled: external_exports.boolean(),
    level: external_exports.string(),
    workerVersion: external_exports.string().optional(),
    queueName: external_exports.string().optional(),
    machinePreset: external_exports.string().optional(),
    properties: external_exports.record(external_exports.any()).optional(),
    output: external_exports.unknown().optional()
  })
});
var RetrieveRunTraceSpan = RetrieveRunTraceSpanSchema.extend({
  children: external_exports.lazy(() => RetrieveRunTraceSpan.array())
});
var RetrieveRunTraceResponseBody = external_exports.object({
  trace: external_exports.object({
    traceId: external_exports.string(),
    rootSpan: RetrieveRunTraceSpan
  })
});
var CreateStreamResponseBody = external_exports.object({
  version: external_exports.string()
});
var AppendToStreamResponseBody = external_exports.object({
  ok: external_exports.boolean(),
  message: external_exports.string().optional()
});

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/config.js
var ConfigManifest = external_exports.object({
  project: external_exports.string(),
  dirs: external_exports.string().array()
});

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/build.js
var BuildExternal = external_exports.object({
  name: external_exports.string(),
  version: external_exports.string()
});
var BuildTarget = external_exports.enum(["dev", "deploy", "unmanaged"]);
var BuildRuntime = external_exports.enum(["node", "node-22", "bun"]);
var BuildManifest = external_exports.object({
  target: BuildTarget,
  packageVersion: external_exports.string(),
  cliPackageVersion: external_exports.string(),
  contentHash: external_exports.string(),
  runtime: BuildRuntime,
  environment: external_exports.string(),
  branch: external_exports.string().optional(),
  config: ConfigManifest,
  files: external_exports.array(TaskFile),
  sources: external_exports.record(external_exports.object({
    contents: external_exports.string(),
    contentHash: external_exports.string()
  })),
  outputPath: external_exports.string(),
  runWorkerEntryPoint: external_exports.string(),
  // Dev & Deploy has a runWorkerEntryPoint
  runControllerEntryPoint: external_exports.string().optional(),
  // Only deploy has a runControllerEntryPoint
  indexWorkerEntryPoint: external_exports.string(),
  // Dev & Deploy has a indexWorkerEntryPoint
  indexControllerEntryPoint: external_exports.string().optional(),
  // Only deploy has a indexControllerEntryPoint
  loaderEntryPoint: external_exports.string().optional(),
  initEntryPoint: external_exports.string().optional(),
  // Optional init.ts entry point
  configPath: external_exports.string(),
  externals: BuildExternal.array().optional(),
  build: external_exports.object({
    env: external_exports.record(external_exports.string()).optional(),
    commands: external_exports.array(external_exports.string()).optional()
  }),
  customConditions: external_exports.array(external_exports.string()).optional(),
  deploy: external_exports.object({
    env: external_exports.record(external_exports.string()).optional(),
    sync: external_exports.object({
      env: external_exports.record(external_exports.string()).optional(),
      parentEnv: external_exports.record(external_exports.string()).optional()
    }).optional()
  }),
  image: external_exports.object({
    pkgs: external_exports.array(external_exports.string()).optional(),
    instructions: external_exports.array(external_exports.string()).optional()
  }).optional(),
  otelImportHook: external_exports.object({
    include: external_exports.array(external_exports.string()).optional(),
    exclude: external_exports.array(external_exports.string()).optional()
  }).optional(),
  /** Maps output file paths to their content hashes for deduplication during dev */
  outputHashes: external_exports.record(external_exports.string()).optional()
});
var IndexMessage = external_exports.object({
  type: external_exports.literal("index"),
  data: external_exports.object({
    build: BuildManifest
  })
});
var WorkerManifest = external_exports.object({
  configPath: external_exports.string(),
  tasks: TaskManifest.array(),
  queues: QueueManifest.array().optional(),
  workerEntryPoint: external_exports.string(),
  controllerEntryPoint: external_exports.string().optional(),
  loaderEntryPoint: external_exports.string().optional(),
  initEntryPoint: external_exports.string().optional(),
  // Optional init.ts entry point
  runtime: BuildRuntime,
  runtimeVersion: external_exports.string().optional(),
  customConditions: external_exports.array(external_exports.string()).optional(),
  timings: external_exports.record(external_exports.number()).optional(),
  processKeepAlive: external_exports.object({
    enabled: external_exports.boolean(),
    maxExecutionsPerProcess: external_exports.number().int().positive().optional()
  }).optional(),
  otelImportHook: external_exports.object({
    include: external_exports.array(external_exports.string()).optional(),
    exclude: external_exports.array(external_exports.string()).optional()
  }).optional()
});
var WorkerManifestMessage = external_exports.object({
  type: external_exports.literal("worker-manifest"),
  data: external_exports.object({
    manifest: WorkerManifest
  })
});
var ImportError = external_exports.object({
  message: external_exports.string(),
  file: external_exports.string(),
  stack: external_exports.string().optional(),
  name: external_exports.string().optional()
});
var ImportTaskFileErrors = external_exports.array(ImportError);

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/runEngineWorker/supervisor/schemas.js
var WorkerApiHeartbeatRequestBody = external_exports.object({
  cpu: external_exports.object({
    used: external_exports.number(),
    available: external_exports.number()
  }),
  memory: external_exports.object({
    used: external_exports.number(),
    available: external_exports.number()
  }),
  tasks: external_exports.array(external_exports.string())
});
var WorkerApiHeartbeatResponseBody = external_exports.object({
  ok: external_exports.literal(true)
});
var WorkerApiSuspendRunRequestBody = external_exports.discriminatedUnion("success", [
  external_exports.object({
    success: external_exports.literal(true),
    checkpoint: CheckpointInput
  }),
  external_exports.object({
    success: external_exports.literal(false),
    error: external_exports.string()
  })
]);
var WorkerApiSuspendRunResponseBody = external_exports.object({
  ok: external_exports.literal(true)
});
var WorkerApiConnectRequestBody = external_exports.object({
  metadata: external_exports.record(external_exports.any())
});
var WorkerApiConnectResponseBody = external_exports.object({
  ok: external_exports.literal(true),
  workerGroup: external_exports.object({
    type: external_exports.string(),
    name: external_exports.string()
  })
});
var WorkerApiDequeueRequestBody = external_exports.object({
  maxResources: MachineResources.optional(),
  maxRunCount: external_exports.number().optional()
});
var WorkerApiDequeueResponseBody = DequeuedMessage.array();
var WorkerApiRunHeartbeatRequestBody = external_exports.object({
  cpu: external_exports.number().optional(),
  memory: external_exports.number().optional()
});
var WorkerApiRunHeartbeatResponseBody = external_exports.object({
  ok: external_exports.literal(true)
});
var WorkerApiRunAttemptStartRequestBody = external_exports.object({
  isWarmStart: external_exports.boolean().optional()
});
var WorkerApiRunAttemptStartResponseBody = StartRunAttemptResult.and(external_exports.object({
  envVars: external_exports.record(external_exports.string())
}));
var WorkerApiRunAttemptCompleteRequestBody = external_exports.object({
  completion: TaskRunExecutionResult
});
var WorkerApiRunAttemptCompleteResponseBody = external_exports.object({
  result: CompleteRunAttemptResult
});
var WorkerApiRunLatestSnapshotResponseBody = external_exports.object({
  execution: RunExecutionData
});
var WorkerApiDequeueFromVersionResponseBody = DequeuedMessage.array();
var DebugLogPropertiesValue = external_exports.union([
  external_exports.string(),
  external_exports.number(),
  external_exports.boolean(),
  external_exports.array(external_exports.string().nullish()),
  external_exports.array(external_exports.number().nullish()),
  external_exports.array(external_exports.boolean().nullish())
]);
var DebugLogProperties = external_exports.record(external_exports.string(), DebugLogPropertiesValue.optional());
var DebugLogPropertiesInput = external_exports.record(external_exports.string(), external_exports.unknown());
var WorkerApiDebugLogBodyInput = external_exports.object({
  time: external_exports.coerce.date(),
  message: external_exports.string(),
  properties: DebugLogPropertiesInput.optional()
});
var WorkerApiDebugLogBody = external_exports.object({
  time: external_exports.coerce.date(),
  message: external_exports.string(),
  properties: DebugLogProperties.optional()
});
var WorkerApiSuspendCompletionResponseBody = external_exports.object({
  success: external_exports.boolean(),
  error: external_exports.string().optional()
});
var WorkerApiRunSnapshotsSinceResponseBody = external_exports.object({
  snapshots: external_exports.array(RunExecutionData)
});

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/messages.js
var AckCallbackResult = external_exports.discriminatedUnion("success", [
  external_exports.object({
    success: external_exports.literal(false),
    error: external_exports.object({
      name: external_exports.string(),
      message: external_exports.string(),
      stack: external_exports.string().optional(),
      stderr: external_exports.string().optional()
    })
  }),
  external_exports.object({
    success: external_exports.literal(true)
  })
]);
var BackgroundWorkerServerMessages = external_exports.discriminatedUnion("type", [
  external_exports.object({
    type: external_exports.literal("CANCEL_ATTEMPT"),
    taskAttemptId: external_exports.string(),
    taskRunId: external_exports.string()
  }),
  external_exports.object({
    type: external_exports.literal("SCHEDULE_ATTEMPT"),
    image: external_exports.string(),
    version: external_exports.string(),
    machine: MachinePreset,
    nextAttemptNumber: external_exports.number().optional(),
    // identifiers
    id: external_exports.string().optional(),
    // TODO: Remove this completely in a future release
    envId: external_exports.string(),
    envType: EnvironmentType,
    orgId: external_exports.string(),
    projectId: external_exports.string(),
    runId: external_exports.string(),
    dequeuedAt: external_exports.number().optional()
  }),
  external_exports.object({
    type: external_exports.literal("EXECUTE_RUN_LAZY_ATTEMPT"),
    payload: TaskRunExecutionLazyAttemptPayload
  })
]);
var serverWebsocketMessages = {
  SERVER_READY: external_exports.object({
    version: external_exports.literal("v1").default("v1"),
    id: external_exports.string()
  }),
  BACKGROUND_WORKER_MESSAGE: external_exports.object({
    version: external_exports.literal("v1").default("v1"),
    backgroundWorkerId: external_exports.string(),
    data: BackgroundWorkerServerMessages
  })
};
var BackgroundWorkerClientMessages = external_exports.discriminatedUnion("type", [
  external_exports.object({
    version: external_exports.literal("v1").default("v1"),
    type: external_exports.literal("TASK_RUN_COMPLETED"),
    completion: TaskRunExecutionResult,
    execution: V3TaskRunExecution
  }),
  external_exports.object({
    version: external_exports.literal("v1").default("v1"),
    type: external_exports.literal("TASK_RUN_FAILED_TO_RUN"),
    completion: TaskRunFailedExecutionResult
  }),
  external_exports.object({
    version: external_exports.literal("v1").default("v1"),
    type: external_exports.literal("TASK_HEARTBEAT"),
    id: external_exports.string()
  }),
  external_exports.object({
    version: external_exports.literal("v1").default("v1"),
    type: external_exports.literal("TASK_RUN_HEARTBEAT"),
    id: external_exports.string()
  })
]);
var ServerBackgroundWorker = external_exports.object({
  id: external_exports.string(),
  version: external_exports.string(),
  contentHash: external_exports.string(),
  engine: RunEngineVersionSchema.optional()
});
var clientWebsocketMessages = {
  READY_FOR_TASKS: external_exports.object({
    version: external_exports.literal("v1").default("v1"),
    backgroundWorkerId: external_exports.string(),
    inProgressRuns: external_exports.string().array().optional()
  }),
  BACKGROUND_WORKER_DEPRECATED: external_exports.object({
    version: external_exports.literal("v1").default("v1"),
    backgroundWorkerId: external_exports.string()
  }),
  BACKGROUND_WORKER_MESSAGE: external_exports.object({
    version: external_exports.literal("v1").default("v1"),
    backgroundWorkerId: external_exports.string(),
    data: BackgroundWorkerClientMessages
  })
};
var UncaughtExceptionMessage = external_exports.object({
  version: external_exports.literal("v1").default("v1"),
  error: external_exports.object({
    name: external_exports.string(),
    message: external_exports.string(),
    stack: external_exports.string().optional()
  }),
  origin: external_exports.enum(["uncaughtException", "unhandledRejection"])
});
var TaskMetadataFailedToParseData = external_exports.object({
  version: external_exports.literal("v1").default("v1"),
  tasks: external_exports.unknown(),
  zodIssues: external_exports.custom((v2) => {
    return Array.isArray(v2) && v2.every((issue) => typeof issue === "object" && "message" in issue);
  })
});
var indexerToWorkerMessages = {
  INDEX_COMPLETE: external_exports.object({
    version: external_exports.literal("v1").default("v1"),
    manifest: WorkerManifest,
    importErrors: ImportTaskFileErrors
  }),
  TASKS_FAILED_TO_PARSE: TaskMetadataFailedToParseData,
  UNCAUGHT_EXCEPTION: UncaughtExceptionMessage
};
var ExecutorToWorkerMessageCatalog = {
  TASK_RUN_COMPLETED: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      execution: TaskRunExecution,
      result: TaskRunExecutionResult
    })
  },
  TASK_HEARTBEAT: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      id: external_exports.string()
    })
  },
  UNCAUGHT_EXCEPTION: {
    message: UncaughtExceptionMessage
  },
  SEND_DEBUG_LOG: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      message: external_exports.string(),
      properties: DebugLogPropertiesInput.optional()
    })
  },
  SET_SUSPENDABLE: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      suspendable: external_exports.boolean()
    })
  },
  MAX_DURATION_EXCEEDED: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      maxDurationInSeconds: external_exports.number(),
      elapsedTimeInSeconds: external_exports.number()
    })
  }
};
var WorkerToExecutorMessageCatalog = {
  EXECUTE_TASK_RUN: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      execution: TaskRunExecution,
      traceContext: external_exports.record(external_exports.unknown()),
      metadata: ServerBackgroundWorker,
      metrics: TaskRunExecutionMetrics.optional(),
      env: external_exports.record(external_exports.string()).optional(),
      isWarmStart: external_exports.boolean().optional()
    })
  },
  FLUSH: {
    message: external_exports.object({
      timeoutInMs: external_exports.number()
    }),
    callback: external_exports.void()
  },
  CANCEL: {
    message: external_exports.object({
      timeoutInMs: external_exports.number()
    }),
    callback: external_exports.void()
  },
  RESOLVE_WAITPOINT: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      waitpoint: CompletedWaitpoint
    })
  }
};
var ProviderToPlatformMessages = {
  LOG: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      data: external_exports.string()
    })
  },
  LOG_WITH_ACK: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      data: external_exports.string()
    }),
    callback: external_exports.object({
      status: external_exports.literal("ok")
    })
  },
  WORKER_CRASHED: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string(),
      reason: external_exports.string().optional(),
      exitCode: external_exports.number().optional(),
      message: external_exports.string().optional(),
      logs: external_exports.string().optional(),
      /** This means we should only update the error if one exists */
      overrideCompletion: external_exports.boolean().optional(),
      errorCode: TaskRunInternalError.shape.code.optional()
    })
  },
  INDEXING_FAILED: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      deploymentId: external_exports.string(),
      error: external_exports.object({
        name: external_exports.string(),
        message: external_exports.string(),
        stack: external_exports.string().optional(),
        stderr: external_exports.string().optional()
      }),
      overrideCompletion: external_exports.boolean().optional()
    })
  }
};
var PlatformToProviderMessages = {
  INDEX: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      imageTag: external_exports.string(),
      shortCode: external_exports.string(),
      apiKey: external_exports.string(),
      apiUrl: external_exports.string(),
      // identifiers
      envId: external_exports.string(),
      envType: EnvironmentType,
      orgId: external_exports.string(),
      projectId: external_exports.string(),
      deploymentId: external_exports.string()
    }),
    callback: AckCallbackResult
  },
  RESTORE: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      type: external_exports.enum(["DOCKER", "KUBERNETES"]),
      location: external_exports.string(),
      reason: external_exports.string().optional(),
      imageRef: external_exports.string(),
      attemptNumber: external_exports.number().optional(),
      machine: MachinePreset,
      // identifiers
      checkpointId: external_exports.string(),
      envId: external_exports.string(),
      envType: EnvironmentType,
      orgId: external_exports.string(),
      projectId: external_exports.string(),
      runId: external_exports.string()
    })
  },
  PRE_PULL_DEPLOYMENT: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      imageRef: external_exports.string(),
      shortCode: external_exports.string(),
      // identifiers
      envId: external_exports.string(),
      envType: EnvironmentType,
      orgId: external_exports.string(),
      projectId: external_exports.string(),
      deploymentId: external_exports.string()
    })
  }
};
var CreateWorkerMessage = external_exports.object({
  projectRef: external_exports.string(),
  envId: external_exports.string(),
  deploymentId: external_exports.string(),
  metadata: external_exports.object({
    cliPackageVersion: external_exports.string().optional(),
    contentHash: external_exports.string(),
    packageVersion: external_exports.string(),
    tasks: TaskResource.array()
  })
});
var CoordinatorToPlatformMessages = {
  LOG: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      metadata: external_exports.any(),
      text: external_exports.string()
    })
  },
  CREATE_WORKER: {
    message: external_exports.discriminatedUnion("version", [
      CreateWorkerMessage.extend({
        version: external_exports.literal("v1")
      }),
      CreateWorkerMessage.extend({
        version: external_exports.literal("v2"),
        supportsLazyAttempts: external_exports.boolean()
      })
    ]),
    callback: external_exports.discriminatedUnion("success", [
      external_exports.object({
        success: external_exports.literal(false)
      }),
      external_exports.object({
        success: external_exports.literal(true)
      })
    ])
  },
  CREATE_TASK_RUN_ATTEMPT: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string(),
      envId: external_exports.string()
    }),
    callback: external_exports.discriminatedUnion("success", [
      external_exports.object({
        success: external_exports.literal(false),
        reason: external_exports.string().optional()
      }),
      external_exports.object({
        success: external_exports.literal(true),
        executionPayload: V3ProdTaskRunExecutionPayload
      })
    ])
  },
  // Deprecated: Only workers without lazy attempt support will use this
  READY_FOR_EXECUTION: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string(),
      totalCompletions: external_exports.number()
    }),
    callback: external_exports.discriminatedUnion("success", [
      external_exports.object({
        success: external_exports.literal(false)
      }),
      external_exports.object({
        success: external_exports.literal(true),
        payload: V3ProdTaskRunExecutionPayload
      })
    ])
  },
  READY_FOR_LAZY_ATTEMPT: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string(),
      envId: external_exports.string(),
      totalCompletions: external_exports.number()
    }),
    callback: external_exports.discriminatedUnion("success", [
      external_exports.object({
        success: external_exports.literal(false),
        reason: external_exports.string().optional()
      }),
      external_exports.object({
        success: external_exports.literal(true),
        lazyPayload: TaskRunExecutionLazyAttemptPayload
      })
    ])
  },
  READY_FOR_RESUME: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      attemptFriendlyId: external_exports.string(),
      type: WaitReason
    })
  },
  TASK_RUN_COMPLETED: {
    message: external_exports.object({
      version: external_exports.enum(["v1", "v2"]).default("v1"),
      execution: V3ProdTaskRunExecution,
      completion: TaskRunExecutionResult,
      checkpoint: external_exports.object({
        docker: external_exports.boolean(),
        location: external_exports.string()
      }).optional()
    })
  },
  TASK_RUN_COMPLETED_WITH_ACK: {
    message: external_exports.object({
      version: external_exports.enum(["v1", "v2"]).default("v2"),
      execution: V3ProdTaskRunExecution,
      completion: TaskRunExecutionResult,
      checkpoint: external_exports.object({
        docker: external_exports.boolean(),
        location: external_exports.string()
      }).optional()
    }),
    callback: AckCallbackResult
  },
  TASK_RUN_FAILED_TO_RUN: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      completion: TaskRunFailedExecutionResult
    })
  },
  TASK_HEARTBEAT: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      attemptFriendlyId: external_exports.string()
    })
  },
  TASK_RUN_HEARTBEAT: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string()
    })
  },
  CHECKPOINT_CREATED: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string().optional(),
      attemptFriendlyId: external_exports.string(),
      docker: external_exports.boolean(),
      location: external_exports.string(),
      reason: external_exports.discriminatedUnion("type", [
        external_exports.object({
          type: external_exports.literal("WAIT_FOR_DURATION"),
          ms: external_exports.number(),
          now: external_exports.number()
        }),
        external_exports.object({
          type: external_exports.literal("WAIT_FOR_BATCH"),
          batchFriendlyId: external_exports.string(),
          runFriendlyIds: external_exports.string().array()
        }),
        external_exports.object({
          type: external_exports.literal("WAIT_FOR_TASK"),
          friendlyId: external_exports.string()
        }),
        external_exports.object({
          type: external_exports.literal("RETRYING_AFTER_FAILURE"),
          attemptNumber: external_exports.number()
        }),
        external_exports.object({
          type: external_exports.literal("MANUAL"),
          /** If unspecified it will be restored immediately, e.g. for live migration */
          restoreAtUnixTimeMs: external_exports.number().optional()
        })
      ])
    }),
    callback: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      keepRunAlive: external_exports.boolean()
    })
  },
  INDEXING_FAILED: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      deploymentId: external_exports.string(),
      error: external_exports.object({
        name: external_exports.string(),
        message: external_exports.string(),
        stack: external_exports.string().optional(),
        stderr: external_exports.string().optional()
      })
    })
  },
  RUN_CRASHED: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string(),
      error: external_exports.object({
        name: external_exports.string(),
        message: external_exports.string(),
        stack: external_exports.string().optional()
      })
    })
  }
};
var PlatformToCoordinatorMessages = {
  /** @deprecated use RESUME_AFTER_DEPENDENCY_WITH_ACK instead  */
  RESUME_AFTER_DEPENDENCY: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string(),
      attemptId: external_exports.string(),
      attemptFriendlyId: external_exports.string(),
      completions: TaskRunExecutionResult.array(),
      executions: TaskRunExecution.array()
    })
  },
  RESUME_AFTER_DEPENDENCY_WITH_ACK: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string(),
      attemptId: external_exports.string(),
      attemptFriendlyId: external_exports.string(),
      completions: TaskRunExecutionResult.array(),
      executions: TaskRunExecution.array()
    }),
    callback: AckCallbackResult
  },
  RESUME_AFTER_DURATION: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      attemptId: external_exports.string(),
      attemptFriendlyId: external_exports.string()
    })
  },
  REQUEST_ATTEMPT_CANCELLATION: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      attemptId: external_exports.string(),
      attemptFriendlyId: external_exports.string()
    })
  },
  REQUEST_RUN_CANCELLATION: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string(),
      delayInMs: external_exports.number().optional()
    })
  },
  READY_FOR_RETRY: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string()
    })
  },
  DYNAMIC_CONFIG: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      checkpointThresholdInMs: external_exports.number()
    })
  }
};
var ClientToSharedQueueMessages = {
  READY_FOR_TASKS: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      backgroundWorkerId: external_exports.string()
    })
  },
  BACKGROUND_WORKER_DEPRECATED: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      backgroundWorkerId: external_exports.string()
    })
  },
  BACKGROUND_WORKER_MESSAGE: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      backgroundWorkerId: external_exports.string(),
      data: BackgroundWorkerClientMessages
    })
  }
};
var SharedQueueToClientMessages = {
  SERVER_READY: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      id: external_exports.string()
    })
  },
  BACKGROUND_WORKER_MESSAGE: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      backgroundWorkerId: external_exports.string(),
      data: BackgroundWorkerServerMessages
    })
  }
};
var IndexTasksMessage = external_exports.object({
  version: external_exports.literal("v1"),
  deploymentId: external_exports.string(),
  tasks: TaskResource.array(),
  packageVersion: external_exports.string()
});
var ProdWorkerToCoordinatorMessages = {
  TEST: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1")
    }),
    callback: external_exports.void()
  },
  INDEX_TASKS: {
    message: external_exports.discriminatedUnion("version", [
      IndexTasksMessage.extend({
        version: external_exports.literal("v1")
      }),
      IndexTasksMessage.extend({
        version: external_exports.literal("v2"),
        supportsLazyAttempts: external_exports.boolean()
      })
    ]),
    callback: external_exports.discriminatedUnion("success", [
      external_exports.object({
        success: external_exports.literal(false)
      }),
      external_exports.object({
        success: external_exports.literal(true)
      })
    ])
  },
  // Deprecated: Only workers without lazy attempt support will use this
  READY_FOR_EXECUTION: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string(),
      totalCompletions: external_exports.number()
    })
  },
  READY_FOR_LAZY_ATTEMPT: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string(),
      totalCompletions: external_exports.number(),
      startTime: external_exports.number().optional()
    })
  },
  READY_FOR_RESUME: {
    message: external_exports.discriminatedUnion("version", [
      external_exports.object({
        version: external_exports.literal("v1"),
        attemptFriendlyId: external_exports.string(),
        type: WaitReason
      }),
      external_exports.object({
        version: external_exports.literal("v2"),
        attemptFriendlyId: external_exports.string(),
        attemptNumber: external_exports.number(),
        type: WaitReason
      })
    ])
  },
  READY_FOR_CHECKPOINT: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1")
    })
  },
  CANCEL_CHECKPOINT: {
    message: external_exports.discriminatedUnion("version", [
      external_exports.object({
        version: external_exports.literal("v1")
      }),
      external_exports.object({
        version: external_exports.literal("v2"),
        reason: WaitReason.optional()
      })
    ]).default({ version: "v1" }),
    callback: external_exports.object({
      version: external_exports.literal("v2").default("v2"),
      checkpointCanceled: external_exports.boolean(),
      reason: WaitReason.optional()
    })
  },
  TASK_HEARTBEAT: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      attemptFriendlyId: external_exports.string()
    })
  },
  TASK_RUN_HEARTBEAT: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string()
    })
  },
  TASK_RUN_COMPLETED: {
    message: external_exports.object({
      version: external_exports.enum(["v1", "v2"]).default("v1"),
      execution: V3ProdTaskRunExecution,
      completion: TaskRunExecutionResult
    }),
    callback: external_exports.object({
      willCheckpointAndRestore: external_exports.boolean(),
      shouldExit: external_exports.boolean()
    })
  },
  TASK_RUN_FAILED_TO_RUN: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      completion: TaskRunFailedExecutionResult
    })
  },
  WAIT_FOR_DURATION: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      ms: external_exports.number(),
      now: external_exports.number(),
      attemptFriendlyId: external_exports.string()
    }),
    callback: external_exports.object({
      willCheckpointAndRestore: external_exports.boolean()
    })
  },
  WAIT_FOR_TASK: {
    message: external_exports.object({
      version: external_exports.enum(["v1", "v2"]).default("v1"),
      friendlyId: external_exports.string(),
      // This is the attempt that is waiting
      attemptFriendlyId: external_exports.string()
    }),
    callback: external_exports.object({
      willCheckpointAndRestore: external_exports.boolean()
    })
  },
  WAIT_FOR_BATCH: {
    message: external_exports.object({
      version: external_exports.enum(["v1", "v2"]).default("v1"),
      batchFriendlyId: external_exports.string(),
      runFriendlyIds: external_exports.string().array(),
      // This is the attempt that is waiting
      attemptFriendlyId: external_exports.string()
    }),
    callback: external_exports.object({
      willCheckpointAndRestore: external_exports.boolean()
    })
  },
  INDEXING_FAILED: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      deploymentId: external_exports.string(),
      error: external_exports.object({
        name: external_exports.string(),
        message: external_exports.string(),
        stack: external_exports.string().optional(),
        stderr: external_exports.string().optional()
      })
    })
  },
  CREATE_TASK_RUN_ATTEMPT: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string()
    }),
    callback: external_exports.discriminatedUnion("success", [
      external_exports.object({
        success: external_exports.literal(false),
        reason: external_exports.string().optional()
      }),
      external_exports.object({
        success: external_exports.literal(true),
        executionPayload: V3ProdTaskRunExecutionPayload
      })
    ])
  },
  UNRECOVERABLE_ERROR: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      error: external_exports.object({
        name: external_exports.string(),
        message: external_exports.string(),
        stack: external_exports.string().optional()
      })
    })
  },
  SET_STATE: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      attemptFriendlyId: external_exports.string().optional(),
      attemptNumber: external_exports.string().optional()
    })
  }
};
var CoordinatorToProdWorkerMessages = {
  RESUME_AFTER_DEPENDENCY: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      attemptId: external_exports.string(),
      completions: TaskRunExecutionResult.array(),
      executions: TaskRunExecution.array()
    })
  },
  RESUME_AFTER_DURATION: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      attemptId: external_exports.string()
    })
  },
  // Deprecated: Only workers without lazy attempt support will use this
  EXECUTE_TASK_RUN: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      executionPayload: V3ProdTaskRunExecutionPayload
    })
  },
  EXECUTE_TASK_RUN_LAZY_ATTEMPT: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      lazyPayload: TaskRunExecutionLazyAttemptPayload
    })
  },
  REQUEST_ATTEMPT_CANCELLATION: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      attemptId: external_exports.string()
    })
  },
  REQUEST_EXIT: {
    message: external_exports.discriminatedUnion("version", [
      external_exports.object({
        version: external_exports.literal("v1")
      }),
      external_exports.object({
        version: external_exports.literal("v2"),
        delayInMs: external_exports.number().optional()
      })
    ])
  },
  READY_FOR_RETRY: {
    message: external_exports.object({
      version: external_exports.literal("v1").default("v1"),
      runId: external_exports.string()
    })
  }
};
var ProdWorkerSocketData = external_exports.object({
  contentHash: external_exports.string(),
  projectRef: external_exports.string(),
  envId: external_exports.string(),
  runId: external_exports.string(),
  attemptFriendlyId: external_exports.string().optional(),
  attemptNumber: external_exports.string().optional(),
  podName: external_exports.string(),
  deploymentId: external_exports.string(),
  deploymentVersion: external_exports.string(),
  requiresCheckpointResumeWithMessage: external_exports.string().optional()
});
var CoordinatorSocketData = external_exports.object({
  supportsDynamicConfig: external_exports.string().optional()
});

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/style.js
var PRIMARY_VARIANT = "primary";
var WARM_VARIANT = "warm";
var COLD_VARIANT = "cold";
var Variant = external_exports.enum([PRIMARY_VARIANT, WARM_VARIANT, COLD_VARIANT]);
var AccessoryItem = external_exports.object({
  text: external_exports.string(),
  variant: external_exports.string().optional(),
  url: external_exports.string().optional()
});
var Accessory = external_exports.object({
  items: external_exports.array(AccessoryItem),
  style: external_exports.enum(["codepath"]).optional()
});
var TaskEventStyle = external_exports.object({
  icon: external_exports.string().optional(),
  variant: Variant.optional(),
  accessory: Accessory.optional()
}).default({
  icon: void 0,
  variant: void 0
});

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/eventFilter.js
var stringPatternMatchers = [
  external_exports.object({
    $endsWith: external_exports.string()
  }),
  external_exports.object({
    $startsWith: external_exports.string()
  }),
  external_exports.object({
    $ignoreCaseEquals: external_exports.string()
  })
];
var EventMatcher = external_exports.union([
  /** Match against a string */
  external_exports.array(external_exports.string()),
  /** Match against a number */
  external_exports.array(external_exports.number()),
  /** Match against a boolean */
  external_exports.array(external_exports.boolean()),
  external_exports.array(external_exports.union([
    ...stringPatternMatchers,
    external_exports.object({
      $exists: external_exports.boolean()
    }),
    external_exports.object({
      $isNull: external_exports.boolean()
    }),
    external_exports.object({
      $anythingBut: external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean()])
    }),
    external_exports.object({
      $anythingBut: external_exports.union([external_exports.array(external_exports.string()), external_exports.array(external_exports.number()), external_exports.array(external_exports.boolean())])
    }),
    external_exports.object({
      $gt: external_exports.number()
    }),
    external_exports.object({
      $lt: external_exports.number()
    }),
    external_exports.object({
      $gte: external_exports.number()
    }),
    external_exports.object({
      $lte: external_exports.number()
    }),
    external_exports.object({
      $between: external_exports.tuple([external_exports.number(), external_exports.number()])
    }),
    external_exports.object({
      $includes: external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean()])
    }),
    external_exports.object({
      $not: external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean()])
    })
  ]))
]);
var EventFilter = external_exports.lazy(() => external_exports.record(external_exports.union([EventMatcher, EventFilter])));

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/fetch.js
var FetchRetryHeadersStrategy = external_exports.object({
  /** The `headers` strategy retries the request using info from the response headers. */
  strategy: external_exports.literal("headers"),
  /** The header to use to determine the maximum number of times to retry the request. */
  limitHeader: external_exports.string(),
  /** The header to use to determine the number of remaining retries. */
  remainingHeader: external_exports.string(),
  /** The header to use to determine the time when the number of remaining retries will be reset. */
  resetHeader: external_exports.string(),
  /** The event filter to use to determine if the request should be retried. */
  bodyFilter: EventFilter.optional(),
  /** The format of the `resetHeader` value. */
  resetFormat: external_exports.enum([
    "unix_timestamp",
    "unix_timestamp_in_ms",
    "iso_8601",
    "iso_8601_duration_openai_variant"
  ]).default("unix_timestamp").optional()
});
var FetchRetryBackoffStrategy = RetryOptions.extend({
  /** The `backoff` strategy retries the request with an exponential backoff. */
  strategy: external_exports.literal("backoff"),
  /** The event filter to use to determine if the request should be retried. */
  bodyFilter: EventFilter.optional()
});
var FetchRetryStrategy = external_exports.discriminatedUnion("strategy", [
  FetchRetryHeadersStrategy,
  FetchRetryBackoffStrategy
]);
var FetchRetryByStatusOptions = external_exports.record(external_exports.string(), FetchRetryStrategy);
var FetchTimeoutOptions = external_exports.object({
  /** The maximum time to wait for the request to complete. */
  durationInMs: external_exports.number().optional(),
  retry: RetryOptions.optional()
});
var FetchRetryOptions = external_exports.object({
  /** The retrying strategy for specific status codes. */
  byStatus: FetchRetryByStatusOptions.optional(),
  /** The timeout options for the request. */
  timeout: RetryOptions.optional(),
  /**
   * The retrying strategy for connection errors.
   */
  connectionError: RetryOptions.optional()
});

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/openTelemetry.js
var ExceptionEventProperties = external_exports.object({
  type: external_exports.string().optional(),
  message: external_exports.string().optional(),
  stacktrace: external_exports.string().optional()
});
var ExceptionSpanEvent = external_exports.object({
  name: external_exports.literal("exception"),
  time: external_exports.coerce.date(),
  properties: external_exports.object({
    exception: ExceptionEventProperties
  })
});
var CancellationSpanEvent = external_exports.object({
  name: external_exports.literal("cancellation"),
  time: external_exports.coerce.date(),
  properties: external_exports.object({
    reason: external_exports.string()
  })
});
var AttemptFailedSpanEvent = external_exports.object({
  name: external_exports.literal("attempt_failed"),
  time: external_exports.coerce.date(),
  properties: external_exports.object({
    exception: ExceptionEventProperties,
    attemptNumber: external_exports.number(),
    runId: external_exports.string()
  })
});
var OtherSpanEvent = external_exports.object({
  name: external_exports.string(),
  time: external_exports.coerce.date(),
  properties: external_exports.record(external_exports.unknown())
});
var SpanEvent = external_exports.union([
  ExceptionSpanEvent,
  CancellationSpanEvent,
  AttemptFailedSpanEvent,
  OtherSpanEvent
]);
var SpanEvents = external_exports.array(SpanEvent);
var SpanMessagingEvent = external_exports.object({
  system: external_exports.string().optional(),
  client_id: external_exports.string().optional(),
  operation: external_exports.enum(["publish", "create", "receive", "deliver"]),
  message: external_exports.any(),
  destination: external_exports.string().optional()
});

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/webhooks.js
var AlertWebhookRunFailedObject = external_exports.object({
  /** Task information */
  task: external_exports.object({
    /** Unique identifier for the task */
    id: external_exports.string(),
    /** File path where the task is defined */
    filePath: external_exports.string(),
    /** Name of the exported task function */
    exportName: external_exports.string().optional(),
    /** Version of the task */
    version: external_exports.string(),
    /** Version of the SDK used */
    sdkVersion: external_exports.string(),
    /** Version of the CLI used */
    cliVersion: external_exports.string()
  }),
  /** Run information */
  run: external_exports.object({
    /** Unique identifier for the run */
    id: external_exports.string(),
    /** Run number */
    number: external_exports.number(),
    /** Current status of the run */
    status: RunStatus,
    /** When the run was created */
    createdAt: external_exports.coerce.date(),
    /** When the run started executing */
    startedAt: external_exports.coerce.date().optional(),
    /** When the run finished executing */
    completedAt: external_exports.coerce.date().optional(),
    /** Whether this is a test run */
    isTest: external_exports.boolean(),
    /** Idempotency key for the run */
    idempotencyKey: external_exports.string().optional(),
    /** Associated tags */
    tags: external_exports.array(external_exports.string()),
    /** Error information */
    error: TaskRunError,
    /** Whether the run was an out-of-memory error */
    isOutOfMemoryError: external_exports.boolean(),
    /** Machine preset used for the run */
    machine: external_exports.string(),
    /** URL to view the run in the dashboard */
    dashboardUrl: external_exports.string()
  }),
  /** Environment information */
  environment: external_exports.object({
    /** Environment ID */
    id: external_exports.string(),
    /** Environment type */
    type: RuntimeEnvironmentTypeSchema,
    /** Environment slug */
    slug: external_exports.string(),
    /** Environment branch name */
    branchName: external_exports.string().optional()
  }),
  /** Organization information */
  organization: external_exports.object({
    /** Organization ID */
    id: external_exports.string(),
    /** Organization slug */
    slug: external_exports.string(),
    /** Organization name */
    name: external_exports.string()
  }),
  /** Project information */
  project: external_exports.object({
    /** Project ID */
    id: external_exports.string(),
    /** Project reference */
    ref: external_exports.string(),
    /** Project slug */
    slug: external_exports.string(),
    /** Project name */
    name: external_exports.string()
  })
});
var DeployError = external_exports.object({
  /** Error name */
  name: external_exports.string(),
  /** Error message */
  message: external_exports.string(),
  /** Error stack trace */
  stack: external_exports.string().optional(),
  /** Standard error output */
  stderr: external_exports.string().optional()
});
var deploymentCommonProperties = {
  /** Environment information */
  environment: external_exports.object({
    id: external_exports.string(),
    type: RuntimeEnvironmentTypeSchema,
    slug: external_exports.string(),
    /** Environment branch name */
    branchName: external_exports.string().optional()
  }),
  /** Organization information */
  organization: external_exports.object({
    id: external_exports.string(),
    slug: external_exports.string(),
    name: external_exports.string()
  }),
  /** Project information */
  project: external_exports.object({
    id: external_exports.string(),
    ref: external_exports.string(),
    slug: external_exports.string(),
    name: external_exports.string()
  })
};
var deploymentDeploymentCommonProperties = {
  /** Deployment ID */
  id: external_exports.string(),
  /** Deployment status */
  status: external_exports.string(),
  /** Deployment version */
  version: external_exports.string(),
  /** Short code identifier */
  shortCode: external_exports.string()
};
var AlertWebhookDeploymentSuccessObject = external_exports.object({
  ...deploymentCommonProperties,
  deployment: external_exports.object({
    ...deploymentDeploymentCommonProperties,
    /** When the deployment completed */
    deployedAt: external_exports.coerce.date()
  }),
  /** Deployed tasks */
  tasks: external_exports.array(external_exports.object({
    /** Task ID */
    id: external_exports.string(),
    /** File path where the task is defined */
    filePath: external_exports.string(),
    /** Name of the exported task function */
    exportName: external_exports.string().optional(),
    /** Source of the trigger */
    triggerSource: external_exports.string()
  }))
});
var AlertWebhookDeploymentFailedObject = external_exports.object({
  ...deploymentCommonProperties,
  deployment: external_exports.object({
    ...deploymentDeploymentCommonProperties,
    /** When the deployment failed */
    failedAt: external_exports.coerce.date()
  }),
  /** Error information */
  error: DeployError
});
var commonProperties = {
  /** Webhook ID */
  id: external_exports.string(),
  /** When the webhook was created */
  created: external_exports.coerce.date(),
  /** Version of the webhook */
  webhookVersion: external_exports.string()
};
var Webhook = external_exports.discriminatedUnion("type", [
  /** Run failed alert webhook */
  external_exports.object({
    ...commonProperties,
    type: external_exports.literal("alert.run.failed"),
    object: AlertWebhookRunFailedObject
  }),
  /** Deployment success alert webhook */
  external_exports.object({
    ...commonProperties,
    type: external_exports.literal("alert.deployment.success"),
    object: AlertWebhookDeploymentSuccessObject
  }),
  /** Deployment failed alert webhook */
  external_exports.object({
    ...commonProperties,
    type: external_exports.literal("alert.deployment.failed"),
    object: AlertWebhookDeploymentFailedObject
  })
]);

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/checkpoints.js
var CallbackUrl = zod_default.string().url().transform((url) => new URL(url));
var CheckpointServiceSuspendRequestBody = zod_default.object({
  type: CheckpointType,
  runId: zod_default.string(),
  snapshotId: zod_default.string(),
  runnerId: zod_default.string(),
  projectRef: zod_default.string(),
  deploymentVersion: zod_default.string(),
  reason: zod_default.string().optional()
});
var CheckpointServiceSuspendResponseBody = zod_default.object({
  ok: zod_default.literal(true)
});
var CheckpointServiceRestoreRequestBody = DequeuedMessage.required({ checkpoint: true });

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/warmStart.js
var WarmStartConnectResponse = external_exports.object({
  connectionTimeoutMs: external_exports.number().optional(),
  keepaliveMs: external_exports.number().optional()
});

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/schemas/queues.js
var queueTypes = ["task", "custom"];
var QueueType = external_exports.enum(queueTypes);
var RetrieveQueueType = external_exports.enum([...queueTypes, "id"]);
var QueueItem = external_exports.object({
  /** The queue id, e.g. queue_12345 */
  id: external_exports.string(),
  /** The queue name */
  name: external_exports.string(),
  /**
   * The queue type, either "task" or "custom"
   * "task" are created automatically for each task.
   * "custom" are created by you explicitly in your code.
   * */
  type: QueueType,
  /** The number of runs currently running */
  running: external_exports.number(),
  /** The number of runs currently queued */
  queued: external_exports.number(),
  /** Whether the queue is paused. If it's paused, no new runs will be started. */
  paused: external_exports.boolean(),
  /** The concurrency limit of the queue */
  concurrencyLimit: external_exports.number().nullable(),
  /** The concurrency limit of the queue */
  concurrency: external_exports.object({
    /** The effective/current concurrency limit */
    current: external_exports.number().nullable(),
    /** The base concurrency limit (default) */
    base: external_exports.number().nullable(),
    /** The effective/current concurrency limit */
    override: external_exports.number().nullable(),
    /** When the override was applied */
    overriddenAt: external_exports.coerce.date().nullable(),
    /** Who overrode the concurrency limit (will be null if overridden via the API) */
    overriddenBy: external_exports.string().nullable()
  }).optional()
});
var ListQueueOptions = external_exports.object({
  /** The page number */
  page: external_exports.number().optional(),
  /** The number of queues per page */
  perPage: external_exports.number().optional()
});
var QueueTypeName = external_exports.object({
  /** "task" or "custom" */
  type: QueueType,
  /** The name of your queue.
   * For "task" type it will be the task id, for "custom" it will be the name you specified.
   * */
  name: external_exports.string()
});
var RetrieveQueueParam = external_exports.union([external_exports.string(), QueueTypeName]);

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/semanticInternalAttributes.js
var SemanticInternalAttributes = {
  ENVIRONMENT_ID: "ctx.environment.id",
  ENVIRONMENT_TYPE: "ctx.environment.type",
  ORGANIZATION_ID: "ctx.organization.id",
  ORGANIZATION_SLUG: "ctx.organization.slug",
  ORGANIZATION_NAME: "ctx.organization.name",
  PROJECT_ID: "ctx.project.id",
  PROJECT_REF: "ctx.project.ref",
  PROJECT_NAME: "ctx.project.title",
  PROJECT_DIR: "project.dir",
  ATTEMPT_ID: "ctx.attempt.id",
  ATTEMPT_NUMBER: "ctx.attempt.number",
  RUN_ID: "ctx.run.id",
  RUN_IS_TEST: "ctx.run.isTest",
  ORIGINAL_RUN_ID: "$original_run_id",
  BATCH_ID: "ctx.batch.id",
  TASK_SLUG: "ctx.task.id",
  TASK_PATH: "ctx.task.filePath",
  TASK_EXPORT_NAME: "ctx.task.exportName",
  QUEUE_NAME: "ctx.queue.name",
  QUEUE_ID: "ctx.queue.id",
  MACHINE_PRESET_NAME: "ctx.machine.name",
  MACHINE_PRESET_CPU: "ctx.machine.cpu",
  MACHINE_PRESET_MEMORY: "ctx.machine.memory",
  MACHINE_PRESET_CENTS_PER_MS: "ctx.machine.centsPerMs",
  SKIP_SPAN_PARTIAL: "$span.skip_partial",
  SPAN_PARTIAL: "$span.partial",
  SPAN_ID: "$span.span_id",
  SPAN: "$span",
  ENTITY_TYPE: "$entity.type",
  ENTITY_ID: "$entity.id",
  ENTITY_METADATA: "$entity.metadata",
  OUTPUT: "$output",
  OUTPUT_TYPE: "$mime_type_output",
  STYLE: "$style",
  STYLE_ICON: "$style.icon",
  STYLE_VARIANT: "$style.variant",
  STYLE_ACCESSORY: "$style.accessory",
  COLLAPSED: "$collapsed",
  METADATA: "$metadata",
  TRIGGER: "$trigger",
  PAYLOAD: "$payload",
  PAYLOAD_TYPE: "$mime_type_payload",
  SHOW: "$show",
  SHOW_ACTIONS: "$show.actions",
  WORKER_ID: "worker.id",
  WORKER_VERSION: "worker.version",
  CLI_VERSION: "cli.version",
  SDK_VERSION: "sdk.version",
  SDK_LANGUAGE: "sdk.language",
  RETRY_AT: "retry.at",
  RETRY_DELAY: "retry.delay",
  RETRY_COUNT: "retry.count",
  LINK_TITLE: "$link.title",
  IDEMPOTENCY_KEY: "ctx.run.idempotencyKey",
  USAGE_DURATION_MS: "$usage.durationMs",
  USAGE_COST_IN_CENTS: "$usage.costInCents",
  USAGE: "$usage",
  RATE_LIMIT_LIMIT: "response.rateLimit.limit",
  RATE_LIMIT_REMAINING: "response.rateLimit.remaining",
  RATE_LIMIT_RESET: "response.rateLimit.reset",
  SPAN_ATTEMPT: "$span.attempt",
  METRIC_EVENTS: "$metrics.events",
  EXECUTION_ENVIRONMENT: "exec_env",
  WARM_START: "warm_start",
  ATTEMPT_EXECUTION_COUNT: "$trigger.executionCount",
  TASK_EVENT_STORE: "$trigger.taskEventStore"
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/utils/platform.js
var _globalThis = typeof globalThis === "object" ? globalThis : global;

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/utils/globals.js
var GLOBAL_TRIGGER_DOT_DEV_KEY = /* @__PURE__ */ Symbol.for(`dev.trigger.ts.api`);
var _global = _globalThis;
function registerGlobal(type, instance, allowOverride = false) {
  const api = _global[GLOBAL_TRIGGER_DOT_DEV_KEY] = _global[GLOBAL_TRIGGER_DOT_DEV_KEY] ?? {};
  if (!allowOverride && api[type]) {
    const err = new Error(`trigger.dev: Attempted duplicate registration of API: ${type}`);
    return false;
  }
  api[type] = instance;
  return true;
}
function getGlobal(type) {
  return _global[GLOBAL_TRIGGER_DOT_DEV_KEY]?.[type];
}
function unregisterGlobal(type) {
  const api = _global[GLOBAL_TRIGGER_DOT_DEV_KEY];
  if (api) {
    delete api[type];
  }
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/taskContext/index.js
var API_NAME = "task-context";
var TaskContextAPI = class _TaskContextAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _TaskContextAPI();
    }
    return this._instance;
  }
  get isInsideTask() {
    return this.#getTaskContext() !== void 0;
  }
  get ctx() {
    return this.#getTaskContext()?.ctx;
  }
  get worker() {
    return this.#getTaskContext()?.worker;
  }
  get isWarmStart() {
    return this.#getTaskContext()?.isWarmStart;
  }
  get attributes() {
    if (this.ctx) {
      return {
        ...this.contextAttributes,
        ...this.workerAttributes,
        [SemanticInternalAttributes.WARM_START]: !!this.isWarmStart
      };
    }
    return {};
  }
  get resourceAttributes() {
    if (this.ctx) {
      return {
        [SemanticInternalAttributes.ENVIRONMENT_ID]: this.ctx.environment.id,
        [SemanticInternalAttributes.ENVIRONMENT_TYPE]: this.ctx.environment.type,
        [SemanticInternalAttributes.ORGANIZATION_ID]: this.ctx.organization.id,
        [SemanticInternalAttributes.PROJECT_ID]: this.ctx.project.id,
        [SemanticInternalAttributes.PROJECT_REF]: this.ctx.project.ref,
        [SemanticInternalAttributes.PROJECT_NAME]: this.ctx.project.name,
        [SemanticInternalAttributes.ORGANIZATION_SLUG]: this.ctx.organization.slug,
        [SemanticInternalAttributes.ORGANIZATION_NAME]: this.ctx.organization.name,
        [SemanticInternalAttributes.MACHINE_PRESET_NAME]: this.ctx.machine?.name,
        [SemanticInternalAttributes.MACHINE_PRESET_CPU]: this.ctx.machine?.cpu,
        [SemanticInternalAttributes.MACHINE_PRESET_MEMORY]: this.ctx.machine?.memory,
        [SemanticInternalAttributes.MACHINE_PRESET_CENTS_PER_MS]: this.ctx.machine?.centsPerMs
      };
    }
    return {};
  }
  get workerAttributes() {
    if (this.worker) {
      return {
        [SemanticInternalAttributes.WORKER_ID]: this.worker.id,
        [SemanticInternalAttributes.WORKER_VERSION]: this.worker.version
      };
    }
    return {};
  }
  get contextAttributes() {
    if (this.ctx) {
      return {
        [SemanticInternalAttributes.ATTEMPT_NUMBER]: this.ctx.attempt.number,
        [SemanticInternalAttributes.TASK_SLUG]: this.ctx.task.id,
        [SemanticInternalAttributes.TASK_PATH]: this.ctx.task.filePath,
        [SemanticInternalAttributes.QUEUE_NAME]: this.ctx.queue.name,
        [SemanticInternalAttributes.QUEUE_ID]: this.ctx.queue.id,
        [SemanticInternalAttributes.RUN_ID]: this.ctx.run.id,
        [SemanticInternalAttributes.RUN_IS_TEST]: this.ctx.run.isTest,
        [SemanticInternalAttributes.BATCH_ID]: this.ctx.batch?.id,
        [SemanticInternalAttributes.IDEMPOTENCY_KEY]: this.ctx.run.idempotencyKey
      };
    }
    return {};
  }
  disable() {
    unregisterGlobal(API_NAME);
  }
  setGlobalTaskContext(taskContext2) {
    return registerGlobal(API_NAME, taskContext2);
  }
  #getTaskContext() {
    return getGlobal(API_NAME);
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/task-context-api.js
var taskContext = TaskContextAPI.getInstance();

// ../../node_modules/.pnpm/zod-validation-error@1.5.0_zod@3.25.76/node_modules/zod-validation-error/dist/esm/utils/joinPath.js
var identifierRegex = /[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*/u;
function joinPath(path) {
  if (path.length === 1) {
    return path[0].toString();
  }
  return path.reduce((acc, item) => {
    if (typeof item === "number") {
      return acc + "[" + item.toString() + "]";
    }
    if (item.includes('"')) {
      return acc + '["' + escapeQuotes(item) + '"]';
    }
    if (!identifierRegex.test(item)) {
      return acc + '["' + item + '"]';
    }
    const separator = acc.length === 0 ? "" : ".";
    return acc + separator + item;
  }, "");
}
function escapeQuotes(str) {
  return str.replace(/"/g, '\\"');
}

// ../../node_modules/.pnpm/zod-validation-error@1.5.0_zod@3.25.76/node_modules/zod-validation-error/dist/esm/utils/NonEmptyArray.js
function isNonEmptyArray(value) {
  return value.length !== 0;
}

// ../../node_modules/.pnpm/zod-validation-error@1.5.0_zod@3.25.76/node_modules/zod-validation-error/dist/esm/ValidationError.js
var MAX_ISSUES_IN_MESSAGE = 99;
var ISSUE_SEPARATOR = "; ";
var UNION_SEPARATOR = ", or ";
var PREFIX = "Validation error";
var PREFIX_SEPARATOR = ": ";
var ValidationError = class extends Error {
  details;
  name;
  constructor(message, details = []) {
    super(message);
    this.details = details;
    this.name = "ZodValidationError";
  }
  toString() {
    return this.message;
  }
};
function getMessageFromZodIssue(issue, issueSeparator, unionSeparator) {
  if (issue.code === "invalid_union") {
    return issue.unionErrors.reduce((acc, zodError) => {
      const newIssues = zodError.issues.map((issue2) => getMessageFromZodIssue(issue2, issueSeparator, unionSeparator)).join(issueSeparator);
      if (!acc.includes(newIssues)) {
        acc.push(newIssues);
      }
      return acc;
    }, []).join(unionSeparator);
  }
  if (isNonEmptyArray(issue.path)) {
    if (issue.path.length === 1) {
      const identifier = issue.path[0];
      if (typeof identifier === "number") {
        return `${issue.message} at index ${identifier}`;
      }
    }
    return `${issue.message} at "${joinPath(issue.path)}"`;
  }
  return issue.message;
}
function conditionallyPrefixMessage(reason, prefix, prefixSeparator) {
  if (prefix !== null) {
    if (reason.length > 0) {
      return [prefix, reason].join(prefixSeparator);
    }
    return prefix;
  }
  if (reason.length > 0) {
    return reason;
  }
  return PREFIX;
}
function fromZodError(zodError, options = {}) {
  const { maxIssuesInMessage = MAX_ISSUES_IN_MESSAGE, issueSeparator = ISSUE_SEPARATOR, unionSeparator = UNION_SEPARATOR, prefixSeparator = PREFIX_SEPARATOR, prefix = PREFIX } = options;
  const reason = zodError.errors.slice(0, maxIssuesInMessage).map((issue) => getMessageFromZodIssue(issue, issueSeparator, unionSeparator)).join(issueSeparator);
  const message = conditionallyPrefixMessage(reason, prefix, prefixSeparator);
  return new ValidationError(message, zodError.errors);
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/utils/retries.js
var defaultRetryOptions = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 1e3,
  maxTimeoutInMs: 6e4,
  randomize: true
};
var defaultFetchRetryOptions = {
  byStatus: {
    "429,408,409,5xx": {
      strategy: "backoff",
      ...defaultRetryOptions
    }
  },
  connectionError: defaultRetryOptions,
  timeout: defaultRetryOptions
};
function calculateNextRetryDelay(options, attempt) {
  const opts = { ...defaultRetryOptions, ...options };
  if (attempt >= opts.maxAttempts) {
    return;
  }
  const { factor, minTimeoutInMs, maxTimeoutInMs, randomize } = opts;
  const random = randomize ? Math.random() + 1 : 1;
  const timeout3 = Math.min(maxTimeoutInMs, random * minTimeoutInMs * Math.pow(factor, attempt - 1));
  return Math.round(timeout3);
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/apiClient/errors.js
var ApiError = class _ApiError extends Error {
  status;
  headers;
  error;
  code;
  param;
  type;
  constructor(status, error, message, headers) {
    super(`${_ApiError.makeMessage(status, error, message)}`);
    this.name = "TriggerApiError";
    this.status = status;
    this.headers = headers;
    const data = error;
    this.error = data;
    this.code = data?.["code"];
    this.param = data?.["param"];
    this.type = data?.["type"];
  }
  static makeMessage(status, error, message) {
    const errorMessage = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : typeof error === "string" ? error : error ? JSON.stringify(error) : void 0;
    if (errorMessage) {
      return errorMessage;
    }
    if (status && message) {
      return `${status} ${message}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (message) {
      return message;
    }
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status) {
      return new ApiConnectionError({ cause: castToError(errorResponse) });
    }
    const error = errorResponse?.["error"];
    if (status === 400) {
      return new BadRequestError(status, error, message, headers);
    }
    if (status === 401) {
      return new AuthenticationError(status, error, message, headers);
    }
    if (status === 403) {
      return new PermissionDeniedError(status, error, message, headers);
    }
    if (status === 404) {
      return new NotFoundError(status, error, message, headers);
    }
    if (status === 409) {
      return new ConflictError(status, error, message, headers);
    }
    if (status === 422) {
      return new UnprocessableEntityError(status, error, message, headers);
    }
    if (status === 429) {
      return new RateLimitError(status, error, message, headers);
    }
    if (status >= 500) {
      return new InternalServerError(status, error, message, headers);
    }
    return new _ApiError(status, error, message, headers);
  }
};
var ApiConnectionError = class extends ApiError {
  status = void 0;
  constructor({ message, cause }) {
    super(void 0, void 0, message || "Connection error.", void 0);
    if (cause)
      this.cause = cause;
  }
};
var BadRequestError = class extends ApiError {
  status = 400;
};
var AuthenticationError = class extends ApiError {
  status = 401;
};
var PermissionDeniedError = class extends ApiError {
  status = 403;
};
var NotFoundError = class extends ApiError {
  status = 404;
};
var ConflictError = class extends ApiError {
  status = 409;
};
var UnprocessableEntityError = class extends ApiError {
  status = 422;
};
var RateLimitError = class extends ApiError {
  status = 429;
  get millisecondsUntilReset() {
    const resetAtUnixEpochMs = (this.headers ?? {})["x-ratelimit-reset"];
    if (typeof resetAtUnixEpochMs === "string") {
      const resetAtUnixEpoch = parseInt(resetAtUnixEpochMs, 10);
      if (isNaN(resetAtUnixEpoch)) {
        return;
      }
      return Math.max(resetAtUnixEpoch - Date.now() + Math.floor(Math.random() * 2e3), 0);
    }
    return;
  }
};
var InternalServerError = class extends ApiError {
};
var ApiSchemaValidationError = class extends ApiError {
  status = 200;
  rawBody;
  constructor({ message, cause, status, rawBody, headers }) {
    super(status, void 0, message || "Validation error.", headers);
    if (cause)
      this.cause = cause;
    this.rawBody = rawBody;
  }
};
var BatchNotSealedError = class extends Error {
  name = "BatchNotSealedError";
  /** The batch ID that was not sealed */
  batchId;
  /** Number of items currently enqueued on the server */
  enqueuedCount;
  /** Number of items expected to complete the batch */
  expectedCount;
  /** Number of items accepted in this request */
  itemsAccepted;
  /** Number of items deduplicated in this request */
  itemsDeduplicated;
  constructor(options) {
    const message = `Batch ${options.batchId} was not sealed: received ${options.enqueuedCount} of ${options.expectedCount} expected items (accepted: ${options.itemsAccepted}, deduplicated: ${options.itemsDeduplicated})`;
    super(message);
    this.batchId = options.batchId;
    this.enqueuedCount = options.enqueuedCount;
    this.expectedCount = options.expectedCount;
    this.itemsAccepted = options.itemsAccepted;
    this.itemsDeduplicated = options.itemsDeduplicated;
  }
};
function castToError(err) {
  if (err instanceof Error)
    return err;
  return new Error(err);
}

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/platform/node/globalThis.js
var _globalThis2 = typeof globalThis === "object" ? globalThis : global;

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/version.js
var VERSION2 = "1.9.0";

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/internal/semver.js
var re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
function _makeCompatibilityCheck(ownVersion) {
  var acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
  var rejectedVersions = /* @__PURE__ */ new Set();
  var myVersionMatch = ownVersion.match(re);
  if (!myVersionMatch) {
    return function() {
      return false;
    };
  }
  var ownVersionParsed = {
    major: +myVersionMatch[1],
    minor: +myVersionMatch[2],
    patch: +myVersionMatch[3],
    prerelease: myVersionMatch[4]
  };
  if (ownVersionParsed.prerelease != null) {
    return function isExactmatch(globalVersion) {
      return globalVersion === ownVersion;
    };
  }
  function _reject(v2) {
    rejectedVersions.add(v2);
    return false;
  }
  function _accept(v2) {
    acceptedVersions.add(v2);
    return true;
  }
  return function isCompatible2(globalVersion) {
    if (acceptedVersions.has(globalVersion)) {
      return true;
    }
    if (rejectedVersions.has(globalVersion)) {
      return false;
    }
    var globalVersionMatch = globalVersion.match(re);
    if (!globalVersionMatch) {
      return _reject(globalVersion);
    }
    var globalVersionParsed = {
      major: +globalVersionMatch[1],
      minor: +globalVersionMatch[2],
      patch: +globalVersionMatch[3],
      prerelease: globalVersionMatch[4]
    };
    if (globalVersionParsed.prerelease != null) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major !== globalVersionParsed.major) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major === 0) {
      if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) {
        return _accept(globalVersion);
      }
      return _reject(globalVersion);
    }
    if (ownVersionParsed.minor <= globalVersionParsed.minor) {
      return _accept(globalVersion);
    }
    return _reject(globalVersion);
  };
}
var isCompatible = _makeCompatibilityCheck(VERSION2);

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/internal/global-utils.js
var major = VERSION2.split(".")[0];
var GLOBAL_OPENTELEMETRY_API_KEY = /* @__PURE__ */ Symbol.for("opentelemetry.js.api." + major);
var _global2 = _globalThis2;
function registerGlobal2(type, instance, diag2, allowOverride) {
  var _a;
  if (allowOverride === void 0) {
    allowOverride = false;
  }
  var api = _global2[GLOBAL_OPENTELEMETRY_API_KEY] = (_a = _global2[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a !== void 0 ? _a : {
    version: VERSION2
  };
  if (!allowOverride && api[type]) {
    var err = new Error("@opentelemetry/api: Attempted duplicate registration of API: " + type);
    diag2.error(err.stack || err.message);
    return false;
  }
  if (api.version !== VERSION2) {
    var err = new Error("@opentelemetry/api: Registration of version v" + api.version + " for " + type + " does not match previously registered API v" + VERSION2);
    diag2.error(err.stack || err.message);
    return false;
  }
  api[type] = instance;
  diag2.debug("@opentelemetry/api: Registered a global for " + type + " v" + VERSION2 + ".");
  return true;
}
function getGlobal2(type) {
  var _a, _b;
  var globalVersion = (_a = _global2[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a === void 0 ? void 0 : _a.version;
  if (!globalVersion || !isCompatible(globalVersion)) {
    return;
  }
  return (_b = _global2[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
}
function unregisterGlobal2(type, diag2) {
  diag2.debug("@opentelemetry/api: Unregistering a global for " + type + " v" + VERSION2 + ".");
  var api = _global2[GLOBAL_OPENTELEMETRY_API_KEY];
  if (api) {
    delete api[type];
  }
}

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js
var __read = function(o2, n2) {
  var m2 = typeof Symbol === "function" && o2[Symbol.iterator];
  if (!m2) return o2;
  var i2 = m2.call(o2), r2, ar = [], e;
  try {
    while ((n2 === void 0 || n2-- > 0) && !(r2 = i2.next()).done) ar.push(r2.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r2 && !r2.done && (m2 = i2["return"])) m2.call(i2);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __spreadArray = function(to, from, pack) {
  if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
    if (ar || !(i2 in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
      ar[i2] = from[i2];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var DiagComponentLogger = (
  /** @class */
  (function() {
    function DiagComponentLogger2(props) {
      this._namespace = props.namespace || "DiagComponentLogger";
    }
    DiagComponentLogger2.prototype.debug = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("debug", this._namespace, args);
    };
    DiagComponentLogger2.prototype.error = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("error", this._namespace, args);
    };
    DiagComponentLogger2.prototype.info = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("info", this._namespace, args);
    };
    DiagComponentLogger2.prototype.warn = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("warn", this._namespace, args);
    };
    DiagComponentLogger2.prototype.verbose = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("verbose", this._namespace, args);
    };
    return DiagComponentLogger2;
  })()
);
function logProxy(funcName, namespace, args) {
  var logger2 = getGlobal2("diag");
  if (!logger2) {
    return;
  }
  args.unshift(namespace);
  return logger2[funcName].apply(logger2, __spreadArray([], __read(args), false));
}

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/diag/types.js
var DiagLogLevel;
(function(DiagLogLevel2) {
  DiagLogLevel2[DiagLogLevel2["NONE"] = 0] = "NONE";
  DiagLogLevel2[DiagLogLevel2["ERROR"] = 30] = "ERROR";
  DiagLogLevel2[DiagLogLevel2["WARN"] = 50] = "WARN";
  DiagLogLevel2[DiagLogLevel2["INFO"] = 60] = "INFO";
  DiagLogLevel2[DiagLogLevel2["DEBUG"] = 70] = "DEBUG";
  DiagLogLevel2[DiagLogLevel2["VERBOSE"] = 80] = "VERBOSE";
  DiagLogLevel2[DiagLogLevel2["ALL"] = 9999] = "ALL";
})(DiagLogLevel || (DiagLogLevel = {}));

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js
function createLogLevelDiagLogger(maxLevel, logger2) {
  if (maxLevel < DiagLogLevel.NONE) {
    maxLevel = DiagLogLevel.NONE;
  } else if (maxLevel > DiagLogLevel.ALL) {
    maxLevel = DiagLogLevel.ALL;
  }
  logger2 = logger2 || {};
  function _filterFunc(funcName, theLevel) {
    var theFunc = logger2[funcName];
    if (typeof theFunc === "function" && maxLevel >= theLevel) {
      return theFunc.bind(logger2);
    }
    return function() {
    };
  }
  return {
    error: _filterFunc("error", DiagLogLevel.ERROR),
    warn: _filterFunc("warn", DiagLogLevel.WARN),
    info: _filterFunc("info", DiagLogLevel.INFO),
    debug: _filterFunc("debug", DiagLogLevel.DEBUG),
    verbose: _filterFunc("verbose", DiagLogLevel.VERBOSE)
  };
}

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/diag.js
var __read2 = function(o2, n2) {
  var m2 = typeof Symbol === "function" && o2[Symbol.iterator];
  if (!m2) return o2;
  var i2 = m2.call(o2), r2, ar = [], e;
  try {
    while ((n2 === void 0 || n2-- > 0) && !(r2 = i2.next()).done) ar.push(r2.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r2 && !r2.done && (m2 = i2["return"])) m2.call(i2);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __spreadArray2 = function(to, from, pack) {
  if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
    if (ar || !(i2 in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
      ar[i2] = from[i2];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var API_NAME2 = "diag";
var DiagAPI = (
  /** @class */
  (function() {
    function DiagAPI2() {
      function _logProxy(funcName) {
        return function() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          var logger2 = getGlobal2("diag");
          if (!logger2)
            return;
          return logger2[funcName].apply(logger2, __spreadArray2([], __read2(args), false));
        };
      }
      var self = this;
      var setLogger = function(logger2, optionsOrLogLevel) {
        var _a, _b, _c;
        if (optionsOrLogLevel === void 0) {
          optionsOrLogLevel = { logLevel: DiagLogLevel.INFO };
        }
        if (logger2 === self) {
          var err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
          self.error((_a = err.stack) !== null && _a !== void 0 ? _a : err.message);
          return false;
        }
        if (typeof optionsOrLogLevel === "number") {
          optionsOrLogLevel = {
            logLevel: optionsOrLogLevel
          };
        }
        var oldLogger = getGlobal2("diag");
        var newLogger = createLogLevelDiagLogger((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : DiagLogLevel.INFO, logger2);
        if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
          var stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
          oldLogger.warn("Current logger will be overwritten from " + stack);
          newLogger.warn("Current logger will overwrite one already registered from " + stack);
        }
        return registerGlobal2("diag", newLogger, self, true);
      };
      self.setLogger = setLogger;
      self.disable = function() {
        unregisterGlobal2(API_NAME2, self);
      };
      self.createComponentLogger = function(options) {
        return new DiagComponentLogger(options);
      };
      self.verbose = _logProxy("verbose");
      self.debug = _logProxy("debug");
      self.info = _logProxy("info");
      self.warn = _logProxy("warn");
      self.error = _logProxy("error");
    }
    DiagAPI2.instance = function() {
      if (!this._instance) {
        this._instance = new DiagAPI2();
      }
      return this._instance;
    };
    return DiagAPI2;
  })()
);

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js
var __read3 = function(o2, n2) {
  var m2 = typeof Symbol === "function" && o2[Symbol.iterator];
  if (!m2) return o2;
  var i2 = m2.call(o2), r2, ar = [], e;
  try {
    while ((n2 === void 0 || n2-- > 0) && !(r2 = i2.next()).done) ar.push(r2.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r2 && !r2.done && (m2 = i2["return"])) m2.call(i2);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __values = function(o2) {
  var s = typeof Symbol === "function" && Symbol.iterator, m2 = s && o2[s], i2 = 0;
  if (m2) return m2.call(o2);
  if (o2 && typeof o2.length === "number") return {
    next: function() {
      if (o2 && i2 >= o2.length) o2 = void 0;
      return { value: o2 && o2[i2++], done: !o2 };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var BaggageImpl = (
  /** @class */
  (function() {
    function BaggageImpl2(entries) {
      this._entries = entries ? new Map(entries) : /* @__PURE__ */ new Map();
    }
    BaggageImpl2.prototype.getEntry = function(key) {
      var entry = this._entries.get(key);
      if (!entry) {
        return void 0;
      }
      return Object.assign({}, entry);
    };
    BaggageImpl2.prototype.getAllEntries = function() {
      return Array.from(this._entries.entries()).map(function(_a) {
        var _b = __read3(_a, 2), k = _b[0], v2 = _b[1];
        return [k, v2];
      });
    };
    BaggageImpl2.prototype.setEntry = function(key, entry) {
      var newBaggage = new BaggageImpl2(this._entries);
      newBaggage._entries.set(key, entry);
      return newBaggage;
    };
    BaggageImpl2.prototype.removeEntry = function(key) {
      var newBaggage = new BaggageImpl2(this._entries);
      newBaggage._entries.delete(key);
      return newBaggage;
    };
    BaggageImpl2.prototype.removeEntries = function() {
      var e_1, _a;
      var keys = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        keys[_i] = arguments[_i];
      }
      var newBaggage = new BaggageImpl2(this._entries);
      try {
        for (var keys_1 = __values(keys), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
          var key = keys_1_1.value;
          newBaggage._entries.delete(key);
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (keys_1_1 && !keys_1_1.done && (_a = keys_1.return)) _a.call(keys_1);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      return newBaggage;
    };
    BaggageImpl2.prototype.clear = function() {
      return new BaggageImpl2();
    };
    return BaggageImpl2;
  })()
);

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/baggage/utils.js
var diag = DiagAPI.instance();
function createBaggage(entries) {
  if (entries === void 0) {
    entries = {};
  }
  return new BaggageImpl(new Map(Object.entries(entries)));
}

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/context/context.js
function createContextKey(description) {
  return Symbol.for(description);
}
var BaseContext = (
  /** @class */
  /* @__PURE__ */ (function() {
    function BaseContext2(parentContext) {
      var self = this;
      self._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
      self.getValue = function(key) {
        return self._currentContext.get(key);
      };
      self.setValue = function(key, value) {
        var context2 = new BaseContext2(self._currentContext);
        context2._currentContext.set(key, value);
        return context2;
      };
      self.deleteValue = function(key) {
        var context2 = new BaseContext2(self._currentContext);
        context2._currentContext.delete(key);
        return context2;
      };
    }
    return BaseContext2;
  })()
);
var ROOT_CONTEXT = new BaseContext();

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js
var defaultTextMapGetter = {
  get: function(carrier, key) {
    if (carrier == null) {
      return void 0;
    }
    return carrier[key];
  },
  keys: function(carrier) {
    if (carrier == null) {
      return [];
    }
    return Object.keys(carrier);
  }
};
var defaultTextMapSetter = {
  set: function(carrier, key, value) {
    if (carrier == null) {
      return;
    }
    carrier[key] = value;
  }
};

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js
var __read4 = function(o2, n2) {
  var m2 = typeof Symbol === "function" && o2[Symbol.iterator];
  if (!m2) return o2;
  var i2 = m2.call(o2), r2, ar = [], e;
  try {
    while ((n2 === void 0 || n2-- > 0) && !(r2 = i2.next()).done) ar.push(r2.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r2 && !r2.done && (m2 = i2["return"])) m2.call(i2);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __spreadArray3 = function(to, from, pack) {
  if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
    if (ar || !(i2 in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
      ar[i2] = from[i2];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var NoopContextManager = (
  /** @class */
  (function() {
    function NoopContextManager2() {
    }
    NoopContextManager2.prototype.active = function() {
      return ROOT_CONTEXT;
    };
    NoopContextManager2.prototype.with = function(_context, fn, thisArg) {
      var args = [];
      for (var _i = 3; _i < arguments.length; _i++) {
        args[_i - 3] = arguments[_i];
      }
      return fn.call.apply(fn, __spreadArray3([thisArg], __read4(args), false));
    };
    NoopContextManager2.prototype.bind = function(_context, target) {
      return target;
    };
    NoopContextManager2.prototype.enable = function() {
      return this;
    };
    NoopContextManager2.prototype.disable = function() {
      return this;
    };
    return NoopContextManager2;
  })()
);

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/context.js
var __read5 = function(o2, n2) {
  var m2 = typeof Symbol === "function" && o2[Symbol.iterator];
  if (!m2) return o2;
  var i2 = m2.call(o2), r2, ar = [], e;
  try {
    while ((n2 === void 0 || n2-- > 0) && !(r2 = i2.next()).done) ar.push(r2.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r2 && !r2.done && (m2 = i2["return"])) m2.call(i2);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __spreadArray4 = function(to, from, pack) {
  if (pack || arguments.length === 2) for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
    if (ar || !(i2 in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i2);
      ar[i2] = from[i2];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var API_NAME3 = "context";
var NOOP_CONTEXT_MANAGER = new NoopContextManager();
var ContextAPI = (
  /** @class */
  (function() {
    function ContextAPI2() {
    }
    ContextAPI2.getInstance = function() {
      if (!this._instance) {
        this._instance = new ContextAPI2();
      }
      return this._instance;
    };
    ContextAPI2.prototype.setGlobalContextManager = function(contextManager) {
      return registerGlobal2(API_NAME3, contextManager, DiagAPI.instance());
    };
    ContextAPI2.prototype.active = function() {
      return this._getContextManager().active();
    };
    ContextAPI2.prototype.with = function(context2, fn, thisArg) {
      var _a;
      var args = [];
      for (var _i = 3; _i < arguments.length; _i++) {
        args[_i - 3] = arguments[_i];
      }
      return (_a = this._getContextManager()).with.apply(_a, __spreadArray4([context2, fn, thisArg], __read5(args), false));
    };
    ContextAPI2.prototype.bind = function(context2, target) {
      return this._getContextManager().bind(context2, target);
    };
    ContextAPI2.prototype._getContextManager = function() {
      return getGlobal2(API_NAME3) || NOOP_CONTEXT_MANAGER;
    };
    ContextAPI2.prototype.disable = function() {
      this._getContextManager().disable();
      unregisterGlobal2(API_NAME3, DiagAPI.instance());
    };
    return ContextAPI2;
  })()
);

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js
var TraceFlags;
(function(TraceFlags2) {
  TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
  TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
})(TraceFlags || (TraceFlags = {}));

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js
var INVALID_SPANID = "0000000000000000";
var INVALID_TRACEID = "00000000000000000000000000000000";
var INVALID_SPAN_CONTEXT = {
  traceId: INVALID_TRACEID,
  spanId: INVALID_SPANID,
  traceFlags: TraceFlags.NONE
};

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js
var NonRecordingSpan = (
  /** @class */
  (function() {
    function NonRecordingSpan2(_spanContext) {
      if (_spanContext === void 0) {
        _spanContext = INVALID_SPAN_CONTEXT;
      }
      this._spanContext = _spanContext;
    }
    NonRecordingSpan2.prototype.spanContext = function() {
      return this._spanContext;
    };
    NonRecordingSpan2.prototype.setAttribute = function(_key, _value) {
      return this;
    };
    NonRecordingSpan2.prototype.setAttributes = function(_attributes) {
      return this;
    };
    NonRecordingSpan2.prototype.addEvent = function(_name, _attributes) {
      return this;
    };
    NonRecordingSpan2.prototype.addLink = function(_link) {
      return this;
    };
    NonRecordingSpan2.prototype.addLinks = function(_links) {
      return this;
    };
    NonRecordingSpan2.prototype.setStatus = function(_status2) {
      return this;
    };
    NonRecordingSpan2.prototype.updateName = function(_name) {
      return this;
    };
    NonRecordingSpan2.prototype.end = function(_endTime) {
    };
    NonRecordingSpan2.prototype.isRecording = function() {
      return false;
    };
    NonRecordingSpan2.prototype.recordException = function(_exception, _time) {
    };
    return NonRecordingSpan2;
  })()
);

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/context-utils.js
var SPAN_KEY = createContextKey("OpenTelemetry Context Key SPAN");
function getSpan(context2) {
  return context2.getValue(SPAN_KEY) || void 0;
}
function getActiveSpan() {
  return getSpan(ContextAPI.getInstance().active());
}
function setSpan(context2, span) {
  return context2.setValue(SPAN_KEY, span);
}
function deleteSpan(context2) {
  return context2.deleteValue(SPAN_KEY);
}
function setSpanContext(context2, spanContext) {
  return setSpan(context2, new NonRecordingSpan(spanContext));
}
function getSpanContext(context2) {
  var _a;
  return (_a = getSpan(context2)) === null || _a === void 0 ? void 0 : _a.spanContext();
}

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js
var VALID_TRACEID_REGEX = /^([0-9a-f]{32})$/i;
var VALID_SPANID_REGEX = /^[0-9a-f]{16}$/i;
function isValidTraceId(traceId) {
  return VALID_TRACEID_REGEX.test(traceId) && traceId !== INVALID_TRACEID;
}
function isValidSpanId(spanId) {
  return VALID_SPANID_REGEX.test(spanId) && spanId !== INVALID_SPANID;
}
function isSpanContextValid(spanContext) {
  return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
}
function wrapSpanContext(spanContext) {
  return new NonRecordingSpan(spanContext);
}

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js
var contextApi = ContextAPI.getInstance();
var NoopTracer = (
  /** @class */
  (function() {
    function NoopTracer2() {
    }
    NoopTracer2.prototype.startSpan = function(name2, options, context2) {
      if (context2 === void 0) {
        context2 = contextApi.active();
      }
      var root = Boolean(options === null || options === void 0 ? void 0 : options.root);
      if (root) {
        return new NonRecordingSpan();
      }
      var parentFromContext = context2 && getSpanContext(context2);
      if (isSpanContext(parentFromContext) && isSpanContextValid(parentFromContext)) {
        return new NonRecordingSpan(parentFromContext);
      } else {
        return new NonRecordingSpan();
      }
    };
    NoopTracer2.prototype.startActiveSpan = function(name2, arg2, arg3, arg4) {
      var opts;
      var ctx;
      var fn;
      if (arguments.length < 2) {
        return;
      } else if (arguments.length === 2) {
        fn = arg2;
      } else if (arguments.length === 3) {
        opts = arg2;
        fn = arg3;
      } else {
        opts = arg2;
        ctx = arg3;
        fn = arg4;
      }
      var parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi.active();
      var span = this.startSpan(name2, opts, parentContext);
      var contextWithSpanSet = setSpan(parentContext, span);
      return contextApi.with(contextWithSpanSet, fn, void 0, span);
    };
    return NoopTracer2;
  })()
);
function isSpanContext(spanContext) {
  return typeof spanContext === "object" && typeof spanContext["spanId"] === "string" && typeof spanContext["traceId"] === "string" && typeof spanContext["traceFlags"] === "number";
}

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js
var NOOP_TRACER = new NoopTracer();
var ProxyTracer = (
  /** @class */
  (function() {
    function ProxyTracer2(_provider, name2, version, options) {
      this._provider = _provider;
      this.name = name2;
      this.version = version;
      this.options = options;
    }
    ProxyTracer2.prototype.startSpan = function(name2, options, context2) {
      return this._getTracer().startSpan(name2, options, context2);
    };
    ProxyTracer2.prototype.startActiveSpan = function(_name, _options, _context, _fn) {
      var tracer2 = this._getTracer();
      return Reflect.apply(tracer2.startActiveSpan, tracer2, arguments);
    };
    ProxyTracer2.prototype._getTracer = function() {
      if (this._delegate) {
        return this._delegate;
      }
      var tracer2 = this._provider.getDelegateTracer(this.name, this.version, this.options);
      if (!tracer2) {
        return NOOP_TRACER;
      }
      this._delegate = tracer2;
      return this._delegate;
    };
    return ProxyTracer2;
  })()
);

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js
var NoopTracerProvider = (
  /** @class */
  (function() {
    function NoopTracerProvider2() {
    }
    NoopTracerProvider2.prototype.getTracer = function(_name, _version, _options) {
      return new NoopTracer();
    };
    return NoopTracerProvider2;
  })()
);

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js
var NOOP_TRACER_PROVIDER = new NoopTracerProvider();
var ProxyTracerProvider = (
  /** @class */
  (function() {
    function ProxyTracerProvider2() {
    }
    ProxyTracerProvider2.prototype.getTracer = function(name2, version, options) {
      var _a;
      return (_a = this.getDelegateTracer(name2, version, options)) !== null && _a !== void 0 ? _a : new ProxyTracer(this, name2, version, options);
    };
    ProxyTracerProvider2.prototype.getDelegate = function() {
      var _a;
      return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_TRACER_PROVIDER;
    };
    ProxyTracerProvider2.prototype.setDelegate = function(delegate) {
      this._delegate = delegate;
    };
    ProxyTracerProvider2.prototype.getDelegateTracer = function(name2, version, options) {
      var _a;
      return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getTracer(name2, version, options);
    };
    return ProxyTracerProvider2;
  })()
);

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/span_kind.js
var SpanKind;
(function(SpanKind2) {
  SpanKind2[SpanKind2["INTERNAL"] = 0] = "INTERNAL";
  SpanKind2[SpanKind2["SERVER"] = 1] = "SERVER";
  SpanKind2[SpanKind2["CLIENT"] = 2] = "CLIENT";
  SpanKind2[SpanKind2["PRODUCER"] = 3] = "PRODUCER";
  SpanKind2[SpanKind2["CONSUMER"] = 4] = "CONSUMER";
})(SpanKind || (SpanKind = {}));

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace/status.js
var SpanStatusCode;
(function(SpanStatusCode2) {
  SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
  SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
  SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
})(SpanStatusCode || (SpanStatusCode = {}));

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/context-api.js
var context = ContextAPI.getInstance();

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js
var NoopTextMapPropagator = (
  /** @class */
  (function() {
    function NoopTextMapPropagator2() {
    }
    NoopTextMapPropagator2.prototype.inject = function(_context, _carrier) {
    };
    NoopTextMapPropagator2.prototype.extract = function(context2, _carrier) {
      return context2;
    };
    NoopTextMapPropagator2.prototype.fields = function() {
      return [];
    };
    return NoopTextMapPropagator2;
  })()
);

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js
var BAGGAGE_KEY = createContextKey("OpenTelemetry Baggage Key");
function getBaggage(context2) {
  return context2.getValue(BAGGAGE_KEY) || void 0;
}
function getActiveBaggage() {
  return getBaggage(ContextAPI.getInstance().active());
}
function setBaggage(context2, baggage) {
  return context2.setValue(BAGGAGE_KEY, baggage);
}
function deleteBaggage(context2) {
  return context2.deleteValue(BAGGAGE_KEY);
}

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/propagation.js
var API_NAME4 = "propagation";
var NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator();
var PropagationAPI = (
  /** @class */
  (function() {
    function PropagationAPI2() {
      this.createBaggage = createBaggage;
      this.getBaggage = getBaggage;
      this.getActiveBaggage = getActiveBaggage;
      this.setBaggage = setBaggage;
      this.deleteBaggage = deleteBaggage;
    }
    PropagationAPI2.getInstance = function() {
      if (!this._instance) {
        this._instance = new PropagationAPI2();
      }
      return this._instance;
    };
    PropagationAPI2.prototype.setGlobalPropagator = function(propagator) {
      return registerGlobal2(API_NAME4, propagator, DiagAPI.instance());
    };
    PropagationAPI2.prototype.inject = function(context2, carrier, setter) {
      if (setter === void 0) {
        setter = defaultTextMapSetter;
      }
      return this._getGlobalPropagator().inject(context2, carrier, setter);
    };
    PropagationAPI2.prototype.extract = function(context2, carrier, getter) {
      if (getter === void 0) {
        getter = defaultTextMapGetter;
      }
      return this._getGlobalPropagator().extract(context2, carrier, getter);
    };
    PropagationAPI2.prototype.fields = function() {
      return this._getGlobalPropagator().fields();
    };
    PropagationAPI2.prototype.disable = function() {
      unregisterGlobal2(API_NAME4, DiagAPI.instance());
    };
    PropagationAPI2.prototype._getGlobalPropagator = function() {
      return getGlobal2(API_NAME4) || NOOP_TEXT_MAP_PROPAGATOR;
    };
    return PropagationAPI2;
  })()
);

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/propagation-api.js
var propagation = PropagationAPI.getInstance();

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/api/trace.js
var API_NAME5 = "trace";
var TraceAPI = (
  /** @class */
  (function() {
    function TraceAPI2() {
      this._proxyTracerProvider = new ProxyTracerProvider();
      this.wrapSpanContext = wrapSpanContext;
      this.isSpanContextValid = isSpanContextValid;
      this.deleteSpan = deleteSpan;
      this.getSpan = getSpan;
      this.getActiveSpan = getActiveSpan;
      this.getSpanContext = getSpanContext;
      this.setSpan = setSpan;
      this.setSpanContext = setSpanContext;
    }
    TraceAPI2.getInstance = function() {
      if (!this._instance) {
        this._instance = new TraceAPI2();
      }
      return this._instance;
    };
    TraceAPI2.prototype.setGlobalTracerProvider = function(provider) {
      var success = registerGlobal2(API_NAME5, this._proxyTracerProvider, DiagAPI.instance());
      if (success) {
        this._proxyTracerProvider.setDelegate(provider);
      }
      return success;
    };
    TraceAPI2.prototype.getTracerProvider = function() {
      return getGlobal2(API_NAME5) || this._proxyTracerProvider;
    };
    TraceAPI2.prototype.getTracer = function(name2, version) {
      return this.getTracerProvider().getTracer(name2, version);
    };
    TraceAPI2.prototype.disable = function() {
      unregisterGlobal2(API_NAME5, DiagAPI.instance());
      this._proxyTracerProvider = new ProxyTracerProvider();
    };
    return TraceAPI2;
  })()
);

// ../../node_modules/.pnpm/@opentelemetry+api@1.9.0/node_modules/@opentelemetry/api/build/esm/trace-api.js
var trace = TraceAPI.getInstance();

// ../../node_modules/.pnpm/@opentelemetry+core@2.0.1_@opentelemetry+api@1.9.0/node_modules/@opentelemetry/core/build/esm/trace/suppress-tracing.js
var SUPPRESS_TRACING_KEY = createContextKey("OpenTelemetry SDK Context Key SUPPRESS_TRACING");
function suppressTracing(context2) {
  return context2.setValue(SUPPRESS_TRACING_KEY, true);
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/utils/flattenAttributes.js
var NULL_SENTINEL = "$@null((";
var CIRCULAR_REFERENCE_SENTINEL = "$@circular((";
var DEFAULT_MAX_DEPTH = 128;
function flattenAttributes(obj, prefix, maxAttributeCount, maxDepth = DEFAULT_MAX_DEPTH) {
  const flattener = new AttributeFlattener(maxAttributeCount, maxDepth);
  flattener.doFlatten(obj, prefix, 0);
  return flattener.attributes;
}
var AttributeFlattener = class {
  maxAttributeCount;
  maxDepth;
  seen = /* @__PURE__ */ new WeakSet();
  attributeCounter = 0;
  result = {};
  constructor(maxAttributeCount, maxDepth = DEFAULT_MAX_DEPTH) {
    this.maxAttributeCount = maxAttributeCount;
    this.maxDepth = maxDepth;
  }
  get attributes() {
    return this.result;
  }
  canAddMoreAttributes() {
    return this.maxAttributeCount === void 0 || this.attributeCounter < this.maxAttributeCount;
  }
  addAttribute(key, value) {
    if (!this.canAddMoreAttributes()) {
      return false;
    }
    this.result[key] = value;
    this.attributeCounter++;
    return true;
  }
  doFlatten(obj, prefix, depth = 0) {
    if (!this.canAddMoreAttributes()) {
      return;
    }
    if (depth > this.maxDepth) {
      return;
    }
    if (obj === void 0) {
      return;
    }
    if (obj === null) {
      this.addAttribute(prefix || "", NULL_SENTINEL);
      return;
    }
    if (typeof obj === "string") {
      this.addAttribute(prefix || "", obj);
      return;
    }
    if (typeof obj === "number") {
      this.addAttribute(prefix || "", obj);
      return;
    }
    if (typeof obj === "boolean") {
      this.addAttribute(prefix || "", obj);
      return;
    }
    if (obj instanceof Date) {
      this.addAttribute(prefix || "", obj.toISOString());
      return;
    }
    if (obj instanceof Error) {
      this.addAttribute(`${prefix || "error"}.name`, obj.name);
      this.addAttribute(`${prefix || "error"}.message`, obj.message);
      if (obj.stack) {
        this.addAttribute(`${prefix || "error"}.stack`, obj.stack);
      }
      return;
    }
    if (typeof obj === "function") {
      const funcName = obj.name || "anonymous";
      this.addAttribute(prefix || "", `[Function: ${funcName}]`);
      return;
    }
    if (obj instanceof Set) {
      let index = 0;
      for (const item of obj) {
        if (!this.canAddMoreAttributes())
          break;
        this.#processValue(item, `${prefix || "set"}.[${index}]`, depth);
        index++;
      }
      return;
    }
    if (obj instanceof Map) {
      for (const [key, value] of obj) {
        if (!this.canAddMoreAttributes())
          break;
        const keyStr = typeof key === "string" ? key : String(key);
        this.#processValue(value, `${prefix || "map"}.${keyStr}`, depth);
      }
      return;
    }
    if (typeof File !== "undefined" && obj instanceof File) {
      this.addAttribute(`${prefix || "file"}.name`, obj.name);
      this.addAttribute(`${prefix || "file"}.size`, obj.size);
      this.addAttribute(`${prefix || "file"}.type`, obj.type);
      this.addAttribute(`${prefix || "file"}.lastModified`, obj.lastModified);
      return;
    }
    if (typeof ReadableStream !== "undefined" && obj instanceof ReadableStream) {
      this.addAttribute(`${prefix || "stream"}.type`, "ReadableStream");
      this.addAttribute(`${prefix || "stream"}.locked`, obj.locked);
      return;
    }
    if (typeof WritableStream !== "undefined" && obj instanceof WritableStream) {
      this.addAttribute(`${prefix || "stream"}.type`, "WritableStream");
      this.addAttribute(`${prefix || "stream"}.locked`, obj.locked);
      return;
    }
    if (obj instanceof Promise) {
      this.addAttribute(prefix || "promise", "[Promise object]");
      return;
    }
    if (obj instanceof RegExp) {
      this.addAttribute(`${prefix || "regexp"}.source`, obj.source);
      this.addAttribute(`${prefix || "regexp"}.flags`, obj.flags);
      return;
    }
    if (typeof URL !== "undefined" && obj instanceof URL) {
      this.addAttribute(`${prefix || "url"}.href`, obj.href);
      this.addAttribute(`${prefix || "url"}.protocol`, obj.protocol);
      this.addAttribute(`${prefix || "url"}.host`, obj.host);
      this.addAttribute(`${prefix || "url"}.pathname`, obj.pathname);
      return;
    }
    if (obj instanceof ArrayBuffer) {
      this.addAttribute(`${prefix || "arraybuffer"}.byteLength`, obj.byteLength);
      return;
    }
    if (ArrayBuffer.isView(obj)) {
      const typedArray = obj;
      this.addAttribute(`${prefix || "typedarray"}.constructor`, typedArray.constructor.name);
      this.addAttribute(`${prefix || "typedarray"}.length`, typedArray.length);
      this.addAttribute(`${prefix || "typedarray"}.byteLength`, typedArray.byteLength);
      this.addAttribute(`${prefix || "typedarray"}.byteOffset`, typedArray.byteOffset);
      return;
    }
    if (obj !== null && typeof obj === "object" && this.seen.has(obj)) {
      this.addAttribute(prefix || "", CIRCULAR_REFERENCE_SENTINEL);
      return;
    }
    if (obj !== null && typeof obj === "object") {
      this.seen.add(obj);
    }
    for (const [key, value] of Object.entries(obj)) {
      if (!this.canAddMoreAttributes()) {
        break;
      }
      const newPrefix = `${prefix ? `${prefix}.` : ""}${Array.isArray(obj) ? `[${key}]` : key}`;
      if (Array.isArray(value)) {
        for (let i2 = 0; i2 < value.length; i2++) {
          if (!this.canAddMoreAttributes()) {
            break;
          }
          this.#processValue(value[i2], `${newPrefix}.[${i2}]`, depth);
        }
      } else {
        this.#processValue(value, newPrefix, depth);
      }
    }
  }
  #processValue(value, prefix, depth) {
    if (!this.canAddMoreAttributes()) {
      return;
    }
    if (value === void 0) {
      return;
    }
    if (value === null) {
      this.addAttribute(prefix, NULL_SENTINEL);
      return;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      this.addAttribute(prefix, value);
      return;
    }
    if (typeof value === "object" || typeof value === "function") {
      this.doFlatten(value, prefix, depth + 1);
    } else {
      this.addAttribute(prefix, String(value));
    }
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/utils/styleAttributes.js
function accessoryAttributes(accessory) {
  return flattenAttributes(accessory, SemanticInternalAttributes.STYLE_ACCESSORY);
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/apiClient/pagination.js
var CursorPage = class {
  pageFetcher;
  data;
  pagination;
  constructor(data, pagination, pageFetcher) {
    this.pageFetcher = pageFetcher;
    this.data = data;
    this.pagination = pagination;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    return !!this.pagination.next;
  }
  hasPreviousPage() {
    return !!this.pagination.previous;
  }
  getNextPage() {
    if (!this.pagination.next) {
      throw new Error("No next page available");
    }
    return this.pageFetcher({ after: this.pagination.next });
  }
  getPreviousPage() {
    if (!this.pagination.previous) {
      throw new Error("No previous page available");
    }
    return this.pageFetcher({ before: this.pagination.previous });
  }
  async *iterPages() {
    let page = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }
  async *[Symbol.asyncIterator]() {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
};
var OffsetLimitPage = class {
  pageFetcher;
  data;
  pagination;
  constructor(data, pagination, pageFetcher) {
    this.pageFetcher = pageFetcher;
    this.data = data;
    this.pagination = pagination;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    return this.pagination.currentPage < this.pagination.totalPages;
  }
  hasPreviousPage() {
    return this.pagination.currentPage > 1;
  }
  getNextPage() {
    if (!this.hasNextPage()) {
      throw new Error("No next page available");
    }
    return this.pageFetcher({
      page: this.pagination.currentPage + 1
    });
  }
  getPreviousPage() {
    if (!this.hasPreviousPage()) {
      throw new Error("No previous page available");
    }
    return this.pageFetcher({
      page: this.pagination.currentPage - 1
    });
  }
  async *iterPages() {
    let page = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }
  async *[Symbol.asyncIterator]() {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
};

// ../../node_modules/.pnpm/eventsource-parser@3.0.6/node_modules/eventsource-parser/dist/index.js
var ParseError = class extends Error {
  constructor(message, options) {
    super(message), this.name = "ParseError", this.type = options.type, this.field = options.field, this.value = options.value, this.line = options.line;
  }
};
function noop(_arg) {
}
function createParser(callbacks) {
  if (typeof callbacks == "function")
    throw new TypeError(
      "`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?"
    );
  const { onEvent = noop, onError = noop, onRetry = noop, onComment } = callbacks;
  let incompleteLine = "", isFirstChunk = true, id, data = "", eventType = "";
  function feed(newChunk) {
    const chunk = isFirstChunk ? newChunk.replace(/^\xEF\xBB\xBF/, "") : newChunk, [complete, incomplete] = splitLines(`${incompleteLine}${chunk}`);
    for (const line of complete)
      parseLine(line);
    incompleteLine = incomplete, isFirstChunk = false;
  }
  function parseLine(line) {
    if (line === "") {
      dispatchEvent();
      return;
    }
    if (line.startsWith(":")) {
      onComment && onComment(line.slice(line.startsWith(": ") ? 2 : 1));
      return;
    }
    const fieldSeparatorIndex = line.indexOf(":");
    if (fieldSeparatorIndex !== -1) {
      const field = line.slice(0, fieldSeparatorIndex), offset = line[fieldSeparatorIndex + 1] === " " ? 2 : 1, value = line.slice(fieldSeparatorIndex + offset);
      processField(field, value, line);
      return;
    }
    processField(line, "", line);
  }
  function processField(field, value, line) {
    switch (field) {
      case "event":
        eventType = value;
        break;
      case "data":
        data = `${data}${value}
`;
        break;
      case "id":
        id = value.includes("\0") ? void 0 : value;
        break;
      case "retry":
        /^\d+$/.test(value) ? onRetry(parseInt(value, 10)) : onError(
          new ParseError(`Invalid \`retry\` value: "${value}"`, {
            type: "invalid-retry",
            value,
            line
          })
        );
        break;
      default:
        onError(
          new ParseError(
            `Unknown field "${field.length > 20 ? `${field.slice(0, 20)}\u2026` : field}"`,
            { type: "unknown-field", field, value, line }
          )
        );
        break;
    }
  }
  function dispatchEvent() {
    data.length > 0 && onEvent({
      id,
      event: eventType || void 0,
      // If the data buffer's last character is a U+000A LINE FEED (LF) character,
      // then remove the last character from the data buffer.
      data: data.endsWith(`
`) ? data.slice(0, -1) : data
    }), id = void 0, data = "", eventType = "";
  }
  function reset(options = {}) {
    incompleteLine && options.consume && parseLine(incompleteLine), isFirstChunk = true, id = void 0, data = "", eventType = "", incompleteLine = "";
  }
  return { feed, reset };
}
function splitLines(chunk) {
  const lines = [];
  let incompleteLine = "", searchIndex = 0;
  for (; searchIndex < chunk.length; ) {
    const crIndex = chunk.indexOf("\r", searchIndex), lfIndex = chunk.indexOf(`
`, searchIndex);
    let lineEnd = -1;
    if (crIndex !== -1 && lfIndex !== -1 ? lineEnd = Math.min(crIndex, lfIndex) : crIndex !== -1 ? crIndex === chunk.length - 1 ? lineEnd = -1 : lineEnd = crIndex : lfIndex !== -1 && (lineEnd = lfIndex), lineEnd === -1) {
      incompleteLine = chunk.slice(searchIndex);
      break;
    } else {
      const line = chunk.slice(searchIndex, lineEnd);
      lines.push(line), searchIndex = lineEnd + 1, chunk[searchIndex - 1] === "\r" && chunk[searchIndex] === `
` && searchIndex++;
    }
  }
  return [lines, incompleteLine];
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/utils/crypto.js
async function randomUUID() {
  const { randomUUID: randomUUID2 } = await import("../crypto.node-NQYPF3CW.js");
  return randomUUID2();
}
async function digestSHA256(data) {
  const { subtle: subtle2 } = await import("../crypto.node-NQYPF3CW.js");
  const hash = await subtle2.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/apiClient/core.js
var defaultRetryOptions2 = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 1e3,
  maxTimeoutInMs: 6e4,
  randomize: false
};
function zodfetch(schema, url, requestInit, options) {
  return new ApiPromise(_doZodFetch(schema, url, requestInit, options));
}
function zodfetchCursorPage(schema, url, params, requestInit, options) {
  const query = new URLSearchParams(params.query);
  if (params.limit) {
    query.set("page[size]", String(params.limit));
  }
  if (params.after) {
    query.set("page[after]", params.after);
  }
  if (params.before) {
    query.set("page[before]", params.before);
  }
  const cursorPageSchema = external_exports.object({
    data: external_exports.array(schema),
    pagination: external_exports.object({
      next: external_exports.string().optional(),
      previous: external_exports.string().optional()
    })
  });
  const $url = new URL(url);
  $url.search = query.toString();
  const fetchResult = _doZodFetch(cursorPageSchema, $url.href, requestInit, options);
  return new CursorPagePromise(fetchResult, schema, url, params, requestInit, options);
}
function zodfetchOffsetLimitPage(schema, url, params, requestInit, options) {
  const query = new URLSearchParams(params.query);
  if (params.limit) {
    query.set("perPage", String(params.limit));
  }
  if (params.page) {
    query.set("page", String(params.page));
  }
  const offsetLimitPageSchema = external_exports.object({
    data: external_exports.array(schema),
    pagination: external_exports.object({
      currentPage: external_exports.coerce.number(),
      totalPages: external_exports.coerce.number(),
      count: external_exports.coerce.number()
    })
  });
  const $url = new URL(url);
  $url.search = query.toString();
  const fetchResult = _doZodFetch(offsetLimitPageSchema, $url.href, requestInit, options);
  return new OffsetLimitPagePromise(fetchResult, schema, url, params, requestInit, options);
}
async function traceZodFetch(params, callback) {
  if (!params.options?.tracer) {
    return callback();
  }
  const url = new URL(params.url);
  const method = params.requestInit?.method ?? "GET";
  const name2 = params.options.name ?? `${method} ${url.pathname}`;
  return await params.options.tracer.startActiveSpan(name2, async (span) => {
    return await callback(span);
  }, {
    attributes: {
      [SemanticInternalAttributes.STYLE_ICON]: params.options?.icon ?? "api",
      ...params.options.attributes
    }
  });
}
async function _doZodFetch(schema, url, requestInit, options) {
  let $requestInit = await requestInit;
  return traceZodFetch({ url, requestInit: $requestInit, options }, async (span) => {
    const requestIdempotencyKey = await randomUUID();
    $requestInit = injectPropagationHeadersIfInWorker($requestInit);
    $requestInit = injectRequestIdempotencyKey(requestIdempotencyKey, $requestInit);
    const result = await _doZodFetchWithRetries(schema, url, $requestInit, options);
    if (options?.onResponseBody && span) {
      options.onResponseBody(result.data, span);
    }
    if (options?.prepareData) {
      result.data = await options.prepareData(result.data, result.response);
    }
    return result;
  });
}
async function _doZodFetchWithRetries(schema, url, requestInit, options, attempt = 1) {
  try {
    const response = await context.with(suppressTracing(context.active()), () => fetch(url, requestInitWithCache(requestInit)));
    const responseHeaders = createResponseHeaders(response.headers);
    if (!response.ok) {
      const retryResult = shouldRetry(response, attempt, options?.retry);
      if (retryResult.retry) {
        await waitForRetry(url, attempt + 1, retryResult.delay, options, requestInit, response);
        return await _doZodFetchWithRetries(schema, url, requestInit, options, attempt + 1);
      } else {
        const errText = await response.text().catch((e) => castToError2(e).message);
        const errJSON = safeJsonParse(errText);
        const errMessage = errJSON ? void 0 : errText;
        throw ApiError.generate(response.status, errJSON, errMessage, responseHeaders);
      }
    }
    const jsonBody = await safeJsonFromResponse(response);
    const parsedResult = schema.safeParse(jsonBody);
    if (parsedResult.success) {
      return { data: parsedResult.data, response };
    }
    const validationError = fromZodError(parsedResult.error);
    throw new ApiSchemaValidationError({
      status: response.status,
      cause: validationError,
      message: validationError.message,
      rawBody: jsonBody,
      headers: responseHeaders
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof ValidationError) {
    }
    if (options?.retry) {
      const retry2 = { ...defaultRetryOptions2, ...options.retry };
      const delay = calculateNextRetryDelay(retry2, attempt);
      if (delay) {
        await waitForRetry(url, attempt + 1, delay, options, requestInit);
        return await _doZodFetchWithRetries(schema, url, requestInit, options, attempt + 1);
      }
    }
    throw new ApiConnectionError({ cause: castToError2(error) });
  }
}
async function safeJsonFromResponse(response) {
  try {
    return await response.clone().json();
  } catch (error) {
    return;
  }
}
function castToError2(err) {
  if (err instanceof Error)
    return err;
  return new Error(err);
}
function shouldRetry(response, attempt, retryOptions) {
  function shouldRetryForOptions() {
    const retry2 = { ...defaultRetryOptions2, ...retryOptions };
    const delay = calculateNextRetryDelay(retry2, attempt);
    if (delay) {
      return { retry: true, delay };
    } else {
      return { retry: false };
    }
  }
  const shouldRetryHeader = response.headers.get("x-should-retry");
  if (shouldRetryHeader === "true")
    return shouldRetryForOptions();
  if (shouldRetryHeader === "false")
    return { retry: false };
  if (response.status === 408)
    return shouldRetryForOptions();
  if (response.status === 409)
    return shouldRetryForOptions();
  if (response.status === 429) {
    if (attempt >= (typeof retryOptions?.maxAttempts === "number" ? retryOptions?.maxAttempts : 3)) {
      return { retry: false };
    }
    const resetAtUnixEpochMs = response.headers.get("x-ratelimit-reset");
    if (resetAtUnixEpochMs) {
      const resetAtUnixEpoch = parseInt(resetAtUnixEpochMs, 10);
      const delay = resetAtUnixEpoch - Date.now() + Math.floor(Math.random() * 1e3);
      if (delay > 0) {
        return { retry: true, delay };
      }
    }
    return shouldRetryForOptions();
  }
  if (response.status >= 500)
    return shouldRetryForOptions();
  return { retry: false };
}
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return void 0;
  }
}
function createResponseHeaders(headers) {
  return new Proxy(Object.fromEntries(
    // @ts-ignore
    headers.entries()
  ), {
    get(target, name2) {
      const key = name2.toString();
      return target[key.toLowerCase()] || target[key];
    }
  });
}
function requestInitWithCache(requestInit) {
  try {
    const withCache = {
      ...requestInit,
      cache: "no-cache"
    };
    const _2 = new Request("http://localhost", withCache);
    return withCache;
  } catch (error) {
    return requestInit ?? {};
  }
}
var ApiPromise = class extends Promise {
  responsePromise;
  constructor(responsePromise) {
    super((resolve) => {
      resolve(null);
    });
    this.responsePromise = responsePromise;
  }
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   */
  asResponse() {
    return this.responsePromise.then((p2) => p2.response);
  }
  /**
   * Gets the parsed response data and the raw `Response` instance.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   */
  async withResponse() {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response };
  }
  parse() {
    return this.responsePromise.then((result) => result.data);
  }
  then(onfulfilled, onrejected) {
    return this.parse().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.parse().catch(onrejected);
  }
  finally(onfinally) {
    return this.parse().finally(onfinally);
  }
};
var CursorPagePromise = class extends ApiPromise {
  schema;
  url;
  params;
  requestInit;
  options;
  constructor(result, schema, url, params, requestInit, options) {
    super(result.then((result2) => ({
      data: new CursorPage(result2.data.data, result2.data.pagination, this.#fetchPage.bind(this)),
      response: result2.response
    })));
    this.schema = schema;
    this.url = url;
    this.params = params;
    this.requestInit = requestInit;
    this.options = options;
  }
  #fetchPage(params) {
    return zodfetchCursorPage(this.schema, this.url, { ...this.params, ...params }, this.requestInit, this.options);
  }
  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator]() {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
};
var OffsetLimitPagePromise = class extends ApiPromise {
  schema;
  url;
  params;
  requestInit;
  options;
  constructor(result, schema, url, params, requestInit, options) {
    super(result.then((result2) => ({
      data: new OffsetLimitPage(result2.data.data, result2.data.pagination, this.#fetchPage.bind(this)),
      response: result2.response
    })));
    this.schema = schema;
    this.url = url;
    this.params = params;
    this.requestInit = requestInit;
    this.options = options;
  }
  #fetchPage(params) {
    return zodfetchOffsetLimitPage(this.schema, this.url, { ...this.params, ...params }, this.requestInit, this.options);
  }
  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator]() {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
};
async function waitForRetry(url, attempt, delay, options, requestInit, response) {
  if (options?.tracer) {
    const method = requestInit?.method ?? "GET";
    return options.tracer.startActiveSpan(response ? `wait after ${response.status}` : `wait after error`, async (span) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }, {
      attributes: {
        [SemanticInternalAttributes.STYLE_ICON]: "wait",
        ...accessoryAttributes({
          items: [
            {
              text: `retrying ${options?.name ?? method.toUpperCase()} in ${delay}ms`,
              variant: "normal"
            }
          ],
          style: "codepath"
        })
      }
    });
  }
  await new Promise((resolve) => setTimeout(resolve, delay));
}
function injectPropagationHeadersIfInWorker(requestInit) {
  const headers = new Headers(requestInit?.headers);
  const headersObject = Object.fromEntries(headers.entries());
  propagation.inject(context.active(), headersObject);
  return {
    ...requestInit,
    headers: new Headers(headersObject)
  };
}
function injectRequestIdempotencyKey(requestIdempotencyKey, requestInit) {
  const headers = new Headers(requestInit?.headers);
  headers.set("x-trigger-request-idempotency-key", requestIdempotencyKey);
  return {
    ...requestInit,
    headers
  };
}

// ../../node_modules/.pnpm/eventsource-parser@3.0.6/node_modules/eventsource-parser/dist/stream.js
var EventSourceParserStream = class extends TransformStream {
  constructor({ onError, onRetry, onComment } = {}) {
    let parser;
    super({
      start(controller) {
        parser = createParser({
          onEvent: (event) => {
            controller.enqueue(event);
          },
          onError(error) {
            onError === "terminate" ? controller.error(error) : typeof onError == "function" && onError(error);
          },
          onRetry,
          onComment
        });
      },
      transform(chunk) {
        parser.feed(chunk);
      }
    });
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/links.js
var links = {
  docs: {
    config: {
      home: "https://trigger.dev/docs/config/config-file",
      additionalPackages: "https://trigger.dev/docs/config/config-file#additionalpackages",
      extensions: "https://trigger.dev/docs/config/config-file#extensions",
      prisma: "https://trigger.dev/docs/config/config-file#prisma"
    },
    machines: {
      home: "https://trigger.dev/docs/v3/machines"
    },
    upgrade: {
      beta: "https://trigger.dev/docs/upgrading-beta"
    },
    troubleshooting: {
      concurrentWaits: "https://trigger.dev/docs/troubleshooting#parallel-waits-are-not-supported",
      stalledExecution: "https://trigger.dev/docs/troubleshooting#task-run-stalled-executing"
    },
    concurrency: {
      recursiveDeadlock: "https://trigger.dev/docs/queue-concurrency#waiting-for-a-subtask-on-the-same-queue",
      deadlock: "https://trigger.dev/docs/queue-concurrency#deadlock"
    },
    gitHubActions: {
      personalAccessToken: "https://trigger.dev/docs/github-actions#creating-a-personal-access-token"
    }
  },
  site: {
    home: "https://trigger.dev",
    contact: "https://trigger.dev/contact"
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/errors.js
var MANUAL_OOM_KILL_ERROR_MESSAGE = "MANUAL_OOM_KILL_ERROR";
function isManualOutOfMemoryError(error) {
  if (error.type === "BUILT_IN_ERROR") {
    if (error.message && error.message === MANUAL_OOM_KILL_ERROR_MESSAGE) {
      return true;
    }
  }
  return false;
}
function isCompleteTaskWithOutput(error) {
  return error instanceof Error && error.name === "CompleteTaskWithOutput";
}
function createErrorTaskError(error) {
  switch (error.type) {
    case "BUILT_IN_ERROR": {
      const e = new Error(error.message);
      e.name = error.name;
      e.stack = error.stackTrace;
      return e;
    }
    case "STRING_ERROR": {
      return error.raw;
    }
    case "CUSTOM_ERROR": {
      return JSON.parse(error.raw);
    }
    case "INTERNAL_ERROR": {
      const e = new Error(error.message ?? `Internal error (${error.code})`);
      e.name = error.code;
      e.stack = error.stackTrace;
      return e;
    }
  }
}
function createJsonErrorObject(error) {
  const enhancedError = taskRunErrorEnhancer(error);
  switch (enhancedError.type) {
    case "BUILT_IN_ERROR": {
      return {
        name: enhancedError.name,
        message: enhancedError.message,
        stackTrace: enhancedError.stackTrace
      };
    }
    case "STRING_ERROR": {
      return {
        message: enhancedError.raw
      };
    }
    case "CUSTOM_ERROR": {
      return {
        message: enhancedError.raw
      };
    }
    case "INTERNAL_ERROR": {
      return {
        message: `trigger.dev internal error (${enhancedError.code})`
      };
    }
  }
}
var prettyInternalErrors = {
  TASK_PROCESS_OOM_KILLED: {
    message: "Your run was terminated due to exceeding the machine's memory limit. Try increasing the machine preset in your task options or replay using a larger machine.",
    link: {
      name: "Machines",
      href: links.docs.machines.home
    }
  },
  TASK_PROCESS_MAYBE_OOM_KILLED: {
    message: "Your run was terminated due to exceeding the machine's memory limit. Try increasing the machine preset in your task options or replay using a larger machine.",
    link: {
      name: "Machines",
      href: links.docs.machines.home
    }
  },
  TASK_PROCESS_SIGSEGV: {
    message: "Your task crashed with a segmentation fault (SIGSEGV). Most likely there's a bug in a package or binary you're using. If this keeps happening and you're unsure why, please get in touch.",
    link: {
      name: "Contact us",
      href: links.site.contact,
      magic: "CONTACT_FORM"
    }
  },
  TASK_PROCESS_SIGTERM: {
    message: "Your task exited after receiving SIGTERM but we don't know why. If this keeps happening, please get in touch so we can investigate.",
    link: {
      name: "Contact us",
      href: links.site.contact,
      magic: "CONTACT_FORM"
    }
  },
  OUTDATED_SDK_VERSION: {
    message: "Your task is using an outdated version of the SDK. Please upgrade to the latest version.",
    link: {
      name: "Beta upgrade guide",
      href: links.docs.upgrade.beta
    }
  },
  TASK_DID_CONCURRENT_WAIT: {
    message: "Parallel waits are not supported, e.g. using Promise.all() around our wait functions.",
    link: {
      name: "Read the docs for solutions",
      href: links.docs.troubleshooting.concurrentWaits
    }
  },
  RECURSIVE_WAIT_DEADLOCK: {
    message: "This run will never execute because it was triggered recursively and the task has no remaining concurrency available.",
    link: {
      name: "See docs for help",
      href: links.docs.concurrency.recursiveDeadlock
    }
  },
  TASK_RUN_STALLED_EXECUTING: {
    link: {
      name: "Read our troubleshooting guide",
      href: links.docs.troubleshooting.stalledExecution
    }
  }
};
var getPrettyTaskRunError = (code) => {
  return {
    type: "INTERNAL_ERROR",
    code,
    ...prettyInternalErrors[code]
  };
};
var findSignalInMessage = (message, truncateLength = 100) => {
  if (!message) {
    return;
  }
  const trunc = truncateLength ? message.slice(0, truncateLength) : message;
  if (trunc.includes("SIGTERM")) {
    return "SIGTERM";
  } else if (trunc.includes("SIGSEGV")) {
    return "SIGSEGV";
  } else if (trunc.includes("SIGKILL")) {
    return "SIGKILL";
  } else if (trunc.includes("SIGABRT")) {
    return "SIGABRT";
  } else {
    return;
  }
};
function taskRunErrorEnhancer(error) {
  switch (error.type) {
    case "BUILT_IN_ERROR": {
      if (error.name === "UnexpectedExitError") {
        if (error.message.startsWith("Unexpected exit with code -1")) {
          const signal = findSignalInMessage(error.stackTrace);
          switch (signal) {
            case "SIGTERM":
              return {
                ...getPrettyTaskRunError("TASK_PROCESS_SIGTERM")
              };
            case "SIGSEGV":
              return {
                ...getPrettyTaskRunError("TASK_PROCESS_SIGSEGV")
              };
            case "SIGKILL":
              return {
                ...getPrettyTaskRunError("TASK_PROCESS_MAYBE_OOM_KILLED")
              };
            case "SIGABRT":
              return {
                ...getPrettyTaskRunError("TASK_PROCESS_MAYBE_OOM_KILLED")
              };
            default:
              return {
                ...getPrettyTaskRunError("TASK_PROCESS_EXITED_WITH_NON_ZERO_CODE"),
                message: error.message,
                stackTrace: error.stackTrace
              };
          }
        }
      }
      if (error.name === "Error") {
        if (error.message === "ffmpeg was killed with signal SIGKILL") {
          return {
            ...getPrettyTaskRunError("TASK_PROCESS_OOM_KILLED")
          };
        }
      }
      if (isManualOutOfMemoryError(error)) {
        return {
          ...getPrettyTaskRunError("TASK_PROCESS_OOM_KILLED")
        };
      }
      if (error.name === "TriggerApiError") {
        if (error.message.startsWith("Deadlock detected:")) {
          return {
            type: "BUILT_IN_ERROR",
            name: "Concurrency Deadlock Error",
            message: error.message,
            stackTrace: "",
            link: {
              name: "Read the docs",
              href: links.docs.concurrency.deadlock
            }
          };
        }
      }
      break;
    }
    case "STRING_ERROR": {
      break;
    }
    case "CUSTOM_ERROR": {
      break;
    }
    case "INTERNAL_ERROR": {
      if (error.code === TaskRunErrorCodes.TASK_PROCESS_EXITED_WITH_NON_ZERO_CODE) {
        const signal = findSignalInMessage(error.message);
        switch (signal) {
          case "SIGTERM":
            return {
              ...getPrettyTaskRunError("TASK_PROCESS_SIGTERM")
            };
          case "SIGSEGV":
            return {
              ...getPrettyTaskRunError("TASK_PROCESS_SIGSEGV")
            };
          case "SIGKILL":
            return {
              ...getPrettyTaskRunError("TASK_PROCESS_MAYBE_OOM_KILLED")
            };
          case "SIGABRT":
            return {
              ...getPrettyTaskRunError("TASK_PROCESS_MAYBE_OOM_KILLED")
            };
          default: {
            return {
              ...getPrettyTaskRunError("TASK_PROCESS_EXITED_WITH_NON_ZERO_CODE"),
              message: error.message,
              stackTrace: error.stackTrace
            };
          }
        }
      }
      return {
        ...error,
        ...getPrettyTaskRunError(error.code)
      };
    }
  }
  return error;
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/streams/asyncIterableStream.js
function createAsyncIterableStream(source, transformer) {
  const transformedStream = source.pipeThrough(new TransformStream(transformer));
  transformedStream[Symbol.asyncIterator] = () => {
    const reader = transformedStream.getReader();
    return {
      async next() {
        const { done, value } = await reader.read();
        return done ? { done: true, value: void 0 } : { done: false, value };
      }
    };
  };
  return transformedStream;
}
function createAsyncIterableReadable(source, transformer, signal) {
  return new ReadableStream({
    async start(controller) {
      const transformedStream = source.pipeThrough(new TransformStream(transformer));
      const reader = transformedStream.getReader();
      signal.addEventListener("abort", () => {
        queueMicrotask(() => {
          reader.cancel();
          controller.close();
        });
      });
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          break;
        }
        controller.enqueue(value);
      }
    }
  });
}
function createAsyncIterableStreamFromAsyncIterable(asyncIterable, transformer, signal) {
  const stream2 = new ReadableStream({
    async start(controller) {
      try {
        if (signal) {
          signal.addEventListener("abort", () => {
            controller.close();
          });
        }
        const iterator = asyncIterable[Symbol.asyncIterator]();
        while (true) {
          if (signal?.aborted) {
            break;
          }
          const { done, value } = await iterator.next();
          if (done) {
            controller.close();
            break;
          }
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      if ("kill" in asyncIterable) {
        asyncIterable.kill();
      }
    }
  });
  const transformedStream = stream2.pipeThrough(new TransformStream(transformer));
  return transformedStream;
}

// ../../node_modules/.pnpm/std-env@3.10.0/node_modules/std-env/dist/index.mjs
var r = /* @__PURE__ */ Object.create(null);
var i = (e) => globalThis.process?.env || import.meta.env || globalThis.Deno?.env.toObject() || globalThis.__env__ || (e ? r : globalThis);
var o = new Proxy(r, { get(e, s) {
  return i()[s] ?? r[s];
}, has(e, s) {
  const E = i();
  return s in E || s in r;
}, set(e, s, E) {
  const B = i(true);
  return B[s] = E, true;
}, deleteProperty(e, s) {
  if (!s) return false;
  const E = i(true);
  return delete E[s], true;
}, ownKeys() {
  const e = i(true);
  return Object.keys(e);
} });
var t = typeof process < "u" && process.env && process.env.NODE_ENV || "";
var f = [["APPVEYOR"], ["AWS_AMPLIFY", "AWS_APP_ID", { ci: true }], ["AZURE_PIPELINES", "SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"], ["AZURE_STATIC", "INPUT_AZURE_STATIC_WEB_APPS_API_TOKEN"], ["APPCIRCLE", "AC_APPCIRCLE"], ["BAMBOO", "bamboo_planKey"], ["BITBUCKET", "BITBUCKET_COMMIT"], ["BITRISE", "BITRISE_IO"], ["BUDDY", "BUDDY_WORKSPACE_ID"], ["BUILDKITE"], ["CIRCLE", "CIRCLECI"], ["CIRRUS", "CIRRUS_CI"], ["CLOUDFLARE_PAGES", "CF_PAGES", { ci: true }], ["CLOUDFLARE_WORKERS", "WORKERS_CI", { ci: true }], ["CODEBUILD", "CODEBUILD_BUILD_ARN"], ["CODEFRESH", "CF_BUILD_ID"], ["DRONE"], ["DRONE", "DRONE_BUILD_EVENT"], ["DSARI"], ["GITHUB_ACTIONS"], ["GITLAB", "GITLAB_CI"], ["GITLAB", "CI_MERGE_REQUEST_ID"], ["GOCD", "GO_PIPELINE_LABEL"], ["LAYERCI"], ["HUDSON", "HUDSON_URL"], ["JENKINS", "JENKINS_URL"], ["MAGNUM"], ["NETLIFY"], ["NETLIFY", "NETLIFY_LOCAL", { ci: false }], ["NEVERCODE"], ["RENDER"], ["SAIL", "SAILCI"], ["SEMAPHORE"], ["SCREWDRIVER"], ["SHIPPABLE"], ["SOLANO", "TDDIUM"], ["STRIDER"], ["TEAMCITY", "TEAMCITY_VERSION"], ["TRAVIS"], ["VERCEL", "NOW_BUILDER"], ["VERCEL", "VERCEL", { ci: false }], ["VERCEL", "VERCEL_ENV", { ci: false }], ["APPCENTER", "APPCENTER_BUILD_ID"], ["CODESANDBOX", "CODESANDBOX_SSE", { ci: false }], ["CODESANDBOX", "CODESANDBOX_HOST", { ci: false }], ["STACKBLITZ"], ["STORMKIT"], ["CLEAVR"], ["ZEABUR"], ["CODESPHERE", "CODESPHERE_APP_ID", { ci: true }], ["RAILWAY", "RAILWAY_PROJECT_ID"], ["RAILWAY", "RAILWAY_SERVICE_ID"], ["DENO-DEPLOY", "DENO_DEPLOYMENT_ID"], ["FIREBASE_APP_HOSTING", "FIREBASE_APP_HOSTING", { ci: true }]];
function b() {
  if (globalThis.process?.env) for (const e of f) {
    const s = e[1] || e[0];
    if (globalThis.process?.env[s]) return { name: e[0].toLowerCase(), ...e[2] };
  }
  return globalThis.process?.env?.SHELL === "/bin/jsh" && globalThis.process?.versions?.webcontainer ? { name: "stackblitz", ci: false } : { name: "", ci: false };
}
var l = b();
var p = l.name;
function n(e) {
  return e ? e !== "false" : false;
}
var I = globalThis.process?.platform || "";
var T = n(o.CI) || l.ci !== false;
var R = n(globalThis.process?.stdout && globalThis.process?.stdout.isTTY);
var d = n(o.DEBUG);
var a = t === "test" || n(o.TEST);
var v = n(o.MINIMAL) || T || a || !R;
var A = /^win/i.test(I);
var M = /^linux/i.test(I);
var m = /^darwin/i.test(I);
var Y = !n(o.NO_COLOR) && (n(o.FORCE_COLOR) || (R || A) && o.TERM !== "dumb" || T);
var C = (globalThis.process?.versions?.node || "").replace(/^v/, "") || null;
var V = Number(C?.split(".")[0]) || null;
var W = globalThis.process || /* @__PURE__ */ Object.create(null);
var _ = { versions: {} };
var y = new Proxy(W, { get(e, s) {
  if (s === "env") return o;
  if (s in e) return e[s];
  if (s in _) return _[s];
} });
var O = globalThis.process?.release?.name === "node";
var c = !!globalThis.Bun || !!globalThis.process?.versions?.bun;
var D = !!globalThis.Deno;
var L = !!globalThis.fastly;
var S = !!globalThis.Netlify;
var u = !!globalThis.EdgeRuntime;
var N = globalThis.navigator?.userAgent === "Cloudflare-Workers";
var F = [[S, "netlify"], [u, "edge-light"], [N, "workerd"], [L, "fastly"], [D, "deno"], [c, "bun"], [O, "node"]];
function G() {
  const e = F.find((s) => s[0]);
  if (e) return { name: e[1] };
}
var P = G();
var K = P?.name || "";

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/utils/getEnv.js
function getEnvVar(name2, defaultValue) {
  return o[name2] ?? defaultValue;
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/utils/ioSerialization.js
var import_path = __toESM(require_lib(), 1);

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/apiClientManager/index.js
var API_NAME6 = "api-client";
var ApiClientMissingError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ApiClientMissingError";
  }
};
var APIClientManagerAPI = class _APIClientManagerAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _APIClientManagerAPI();
    }
    return this._instance;
  }
  disable() {
    unregisterGlobal(API_NAME6);
  }
  get baseURL() {
    const config = this.#getConfig();
    return config?.baseURL ?? getEnvVar("TRIGGER_API_URL") ?? "https://api.trigger.dev";
  }
  get accessToken() {
    const config = this.#getConfig();
    return config?.secretKey ?? config?.accessToken ?? getEnvVar("TRIGGER_SECRET_KEY") ?? getEnvVar("TRIGGER_ACCESS_TOKEN");
  }
  get branchName() {
    const config = this.#getConfig();
    const value = config?.previewBranch ?? getEnvVar("TRIGGER_PREVIEW_BRANCH") ?? getEnvVar("VERCEL_GIT_COMMIT_REF") ?? void 0;
    return value ? value : void 0;
  }
  get client() {
    if (!this.baseURL || !this.accessToken) {
      return void 0;
    }
    const requestOptions = this.#getConfig()?.requestOptions;
    const futureFlags = this.#getConfig()?.future;
    return new ApiClient(this.baseURL, this.accessToken, this.branchName, requestOptions, futureFlags);
  }
  clientOrThrow(config) {
    const baseURL = config?.baseURL ?? this.baseURL;
    const accessToken = config?.accessToken ?? config?.secretKey ?? this.accessToken;
    if (!baseURL || !accessToken) {
      throw new ApiClientMissingError(this.apiClientMissingError());
    }
    const branchName = config?.previewBranch ?? this.branchName;
    const requestOptions = config?.requestOptions ?? this.#getConfig()?.requestOptions;
    const futureFlags = config?.future ?? this.#getConfig()?.future;
    return new ApiClient(baseURL, accessToken, branchName, requestOptions, futureFlags);
  }
  runWithConfig(config, fn) {
    const originalConfig = this.#getConfig();
    const $config = { ...originalConfig, ...config };
    registerGlobal(API_NAME6, $config, true);
    return fn().finally(() => {
      registerGlobal(API_NAME6, originalConfig, true);
    });
  }
  setGlobalAPIClientConfiguration(config) {
    return registerGlobal(API_NAME6, config);
  }
  #getConfig() {
    return getGlobal(API_NAME6);
  }
  apiClientMissingError() {
    const hasBaseUrl = !!this.baseURL;
    const hasAccessToken = !!this.accessToken;
    if (!hasBaseUrl && !hasAccessToken) {
      return `You need to set the TRIGGER_API_URL and TRIGGER_SECRET_KEY environment variables. See https://trigger.dev/docs/management/overview#authentication`;
    } else if (!hasBaseUrl) {
      return `You need to set the TRIGGER_API_URL environment variable. See https://trigger.dev/docs/management/overview#authentication`;
    } else if (!hasAccessToken) {
      return `You need to set the TRIGGER_SECRET_KEY environment variable. See https://trigger.dev/docs/management/overview#authentication`;
    }
    return `Unknown error`;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/apiClientManager-api.js
var apiClientManager = APIClientManagerAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/limits.js
function getOtelEnvVarLimit(key, defaultValue) {
  const value = getEnvVar(key);
  if (!value) {
    return defaultValue;
  }
  return parseInt(value, 10);
}
var OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT = getOtelEnvVarLimit("TRIGGER_OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT", 1024);
var OTEL_LOG_ATTRIBUTE_COUNT_LIMIT = getOtelEnvVarLimit("TRIGGER_OTEL_LOG_ATTRIBUTE_COUNT_LIMIT", 1024);
var OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT = getOtelEnvVarLimit("TRIGGER_OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT", 131072);
var OTEL_LOG_ATTRIBUTE_VALUE_LENGTH_LIMIT = getOtelEnvVarLimit("TRIGGER_OTEL_LOG_ATTRIBUTE_VALUE_LENGTH_LIMIT", 131072);
var OTEL_SPAN_EVENT_COUNT_LIMIT = getOtelEnvVarLimit("TRIGGER_OTEL_SPAN_EVENT_COUNT_LIMIT", 10);
var OTEL_LINK_COUNT_LIMIT = getOtelEnvVarLimit("TRIGGER_OTEL_LINK_COUNT_LIMIT", 2);
var OTEL_ATTRIBUTE_PER_LINK_COUNT_LIMIT = getOtelEnvVarLimit("TRIGGER_OTEL_ATTRIBUTE_PER_LINK_COUNT_LIMIT", 10);
var OTEL_ATTRIBUTE_PER_EVENT_COUNT_LIMIT = getOtelEnvVarLimit("TRIGGER_OTEL_ATTRIBUTE_PER_EVENT_COUNT_LIMIT", 10);
var OFFLOAD_IO_PACKET_LENGTH_LIMIT = 128 * 1024;

// ../../node_modules/.pnpm/superjson@2.2.6/node_modules/superjson/dist/double-indexed-kv.js
var DoubleIndexedKV = class {
  constructor() {
    this.keyToValue = /* @__PURE__ */ new Map();
    this.valueToKey = /* @__PURE__ */ new Map();
  }
  set(key, value) {
    this.keyToValue.set(key, value);
    this.valueToKey.set(value, key);
  }
  getByKey(key) {
    return this.keyToValue.get(key);
  }
  getByValue(value) {
    return this.valueToKey.get(value);
  }
  clear() {
    this.keyToValue.clear();
    this.valueToKey.clear();
  }
};

// ../../node_modules/.pnpm/superjson@2.2.6/node_modules/superjson/dist/registry.js
var Registry = class {
  constructor(generateIdentifier) {
    this.generateIdentifier = generateIdentifier;
    this.kv = new DoubleIndexedKV();
  }
  register(value, identifier) {
    if (this.kv.getByValue(value)) {
      return;
    }
    if (!identifier) {
      identifier = this.generateIdentifier(value);
    }
    this.kv.set(identifier, value);
  }
  clear() {
    this.kv.clear();
  }
  getIdentifier(value) {
    return this.kv.getByValue(value);
  }
  getValue(identifier) {
    return this.kv.getByKey(identifier);
  }
};

// ../../node_modules/.pnpm/superjson@2.2.6/node_modules/superjson/dist/class-registry.js
var ClassRegistry = class extends Registry {
  constructor() {
    super((c2) => c2.name);
    this.classToAllowedProps = /* @__PURE__ */ new Map();
  }
  register(value, options) {
    if (typeof options === "object") {
      if (options.allowProps) {
        this.classToAllowedProps.set(value, options.allowProps);
      }
      super.register(value, options.identifier);
    } else {
      super.register(value, options);
    }
  }
  getAllowedProps(value) {
    return this.classToAllowedProps.get(value);
  }
};

// ../../node_modules/.pnpm/superjson@2.2.6/node_modules/superjson/dist/util.js
function valuesOfObj(record) {
  if ("values" in Object) {
    return Object.values(record);
  }
  const values = [];
  for (const key in record) {
    if (record.hasOwnProperty(key)) {
      values.push(record[key]);
    }
  }
  return values;
}
function find(record, predicate) {
  const values = valuesOfObj(record);
  if ("find" in values) {
    return values.find(predicate);
  }
  const valuesNotNever = values;
  for (let i2 = 0; i2 < valuesNotNever.length; i2++) {
    const value = valuesNotNever[i2];
    if (predicate(value)) {
      return value;
    }
  }
  return void 0;
}
function forEach(record, run) {
  Object.entries(record).forEach(([key, value]) => run(value, key));
}
function includes(arr, value) {
  return arr.indexOf(value) !== -1;
}
function findArr(record, predicate) {
  for (let i2 = 0; i2 < record.length; i2++) {
    const value = record[i2];
    if (predicate(value)) {
      return value;
    }
  }
  return void 0;
}

// ../../node_modules/.pnpm/superjson@2.2.6/node_modules/superjson/dist/custom-transformer-registry.js
var CustomTransformerRegistry = class {
  constructor() {
    this.transfomers = {};
  }
  register(transformer) {
    this.transfomers[transformer.name] = transformer;
  }
  findApplicable(v2) {
    return find(this.transfomers, (transformer) => transformer.isApplicable(v2));
  }
  findByName(name2) {
    return this.transfomers[name2];
  }
};

// ../../node_modules/.pnpm/superjson@2.2.6/node_modules/superjson/dist/is.js
var getType = (payload) => Object.prototype.toString.call(payload).slice(8, -1);
var isUndefined = (payload) => typeof payload === "undefined";
var isNull = (payload) => payload === null;
var isPlainObject = (payload) => {
  if (typeof payload !== "object" || payload === null)
    return false;
  if (payload === Object.prototype)
    return false;
  if (Object.getPrototypeOf(payload) === null)
    return true;
  return Object.getPrototypeOf(payload) === Object.prototype;
};
var isEmptyObject = (payload) => isPlainObject(payload) && Object.keys(payload).length === 0;
var isArray = (payload) => Array.isArray(payload);
var isString = (payload) => typeof payload === "string";
var isNumber = (payload) => typeof payload === "number" && !isNaN(payload);
var isBoolean = (payload) => typeof payload === "boolean";
var isRegExp = (payload) => payload instanceof RegExp;
var isMap = (payload) => payload instanceof Map;
var isSet = (payload) => payload instanceof Set;
var isSymbol = (payload) => getType(payload) === "Symbol";
var isDate = (payload) => payload instanceof Date && !isNaN(payload.valueOf());
var isError = (payload) => payload instanceof Error;
var isNaNValue = (payload) => typeof payload === "number" && isNaN(payload);
var isPrimitive = (payload) => isBoolean(payload) || isNull(payload) || isUndefined(payload) || isNumber(payload) || isString(payload) || isSymbol(payload);
var isBigint = (payload) => typeof payload === "bigint";
var isInfinite = (payload) => payload === Infinity || payload === -Infinity;
var isTypedArray = (payload) => ArrayBuffer.isView(payload) && !(payload instanceof DataView);
var isURL = (payload) => payload instanceof URL;

// ../../node_modules/.pnpm/superjson@2.2.6/node_modules/superjson/dist/pathstringifier.js
var escapeKey = (key) => key.replace(/\\/g, "\\\\").replace(/\./g, "\\.");
var stringifyPath = (path) => path.map(String).map(escapeKey).join(".");
var parsePath = (string, legacyPaths) => {
  const result = [];
  let segment = "";
  for (let i2 = 0; i2 < string.length; i2++) {
    let char = string.charAt(i2);
    if (!legacyPaths && char === "\\") {
      const escaped = string.charAt(i2 + 1);
      if (escaped === "\\") {
        segment += "\\";
        i2++;
        continue;
      } else if (escaped !== ".") {
        throw Error("invalid path");
      }
    }
    const isEscapedDot = char === "\\" && string.charAt(i2 + 1) === ".";
    if (isEscapedDot) {
      segment += ".";
      i2++;
      continue;
    }
    const isEndOfSegment = char === ".";
    if (isEndOfSegment) {
      result.push(segment);
      segment = "";
      continue;
    }
    segment += char;
  }
  const lastSegment = segment;
  result.push(lastSegment);
  return result;
};

// ../../node_modules/.pnpm/superjson@2.2.6/node_modules/superjson/dist/transformer.js
function simpleTransformation(isApplicable, annotation, transform, untransform) {
  return {
    isApplicable,
    annotation,
    transform,
    untransform
  };
}
var simpleRules = [
  simpleTransformation(isUndefined, "undefined", () => null, () => void 0),
  simpleTransformation(isBigint, "bigint", (v2) => v2.toString(), (v2) => {
    if (typeof BigInt !== "undefined") {
      return BigInt(v2);
    }
    console.error("Please add a BigInt polyfill.");
    return v2;
  }),
  simpleTransformation(isDate, "Date", (v2) => v2.toISOString(), (v2) => new Date(v2)),
  simpleTransformation(isError, "Error", (v2, superJson) => {
    const baseError = {
      name: v2.name,
      message: v2.message
    };
    if ("cause" in v2) {
      baseError.cause = v2.cause;
    }
    superJson.allowedErrorProps.forEach((prop) => {
      baseError[prop] = v2[prop];
    });
    return baseError;
  }, (v2, superJson) => {
    const e = new Error(v2.message, { cause: v2.cause });
    e.name = v2.name;
    e.stack = v2.stack;
    superJson.allowedErrorProps.forEach((prop) => {
      e[prop] = v2[prop];
    });
    return e;
  }),
  simpleTransformation(isRegExp, "regexp", (v2) => "" + v2, (regex) => {
    const body = regex.slice(1, regex.lastIndexOf("/"));
    const flags = regex.slice(regex.lastIndexOf("/") + 1);
    return new RegExp(body, flags);
  }),
  simpleTransformation(
    isSet,
    "set",
    // (sets only exist in es6+)
    // eslint-disable-next-line es5/no-es6-methods
    (v2) => [...v2.values()],
    (v2) => new Set(v2)
  ),
  simpleTransformation(isMap, "map", (v2) => [...v2.entries()], (v2) => new Map(v2)),
  simpleTransformation((v2) => isNaNValue(v2) || isInfinite(v2), "number", (v2) => {
    if (isNaNValue(v2)) {
      return "NaN";
    }
    if (v2 > 0) {
      return "Infinity";
    } else {
      return "-Infinity";
    }
  }, Number),
  simpleTransformation((v2) => v2 === 0 && 1 / v2 === -Infinity, "number", () => {
    return "-0";
  }, Number),
  simpleTransformation(isURL, "URL", (v2) => v2.toString(), (v2) => new URL(v2))
];
function compositeTransformation(isApplicable, annotation, transform, untransform) {
  return {
    isApplicable,
    annotation,
    transform,
    untransform
  };
}
var symbolRule = compositeTransformation((s, superJson) => {
  if (isSymbol(s)) {
    const isRegistered = !!superJson.symbolRegistry.getIdentifier(s);
    return isRegistered;
  }
  return false;
}, (s, superJson) => {
  const identifier = superJson.symbolRegistry.getIdentifier(s);
  return ["symbol", identifier];
}, (v2) => v2.description, (_2, a2, superJson) => {
  const value = superJson.symbolRegistry.getValue(a2[1]);
  if (!value) {
    throw new Error("Trying to deserialize unknown symbol");
  }
  return value;
});
var constructorToName = [
  Int8Array,
  Uint8Array,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
  Uint8ClampedArray
].reduce((obj, ctor) => {
  obj[ctor.name] = ctor;
  return obj;
}, {});
var typedArrayRule = compositeTransformation(isTypedArray, (v2) => ["typed-array", v2.constructor.name], (v2) => [...v2], (v2, a2) => {
  const ctor = constructorToName[a2[1]];
  if (!ctor) {
    throw new Error("Trying to deserialize unknown typed array");
  }
  return new ctor(v2);
});
function isInstanceOfRegisteredClass(potentialClass, superJson) {
  if (potentialClass?.constructor) {
    const isRegistered = !!superJson.classRegistry.getIdentifier(potentialClass.constructor);
    return isRegistered;
  }
  return false;
}
var classRule = compositeTransformation(isInstanceOfRegisteredClass, (clazz, superJson) => {
  const identifier = superJson.classRegistry.getIdentifier(clazz.constructor);
  return ["class", identifier];
}, (clazz, superJson) => {
  const allowedProps = superJson.classRegistry.getAllowedProps(clazz.constructor);
  if (!allowedProps) {
    return { ...clazz };
  }
  const result = {};
  allowedProps.forEach((prop) => {
    result[prop] = clazz[prop];
  });
  return result;
}, (v2, a2, superJson) => {
  const clazz = superJson.classRegistry.getValue(a2[1]);
  if (!clazz) {
    throw new Error(`Trying to deserialize unknown class '${a2[1]}' - check https://github.com/blitz-js/superjson/issues/116#issuecomment-773996564`);
  }
  return Object.assign(Object.create(clazz.prototype), v2);
});
var customRule = compositeTransformation((value, superJson) => {
  return !!superJson.customTransformerRegistry.findApplicable(value);
}, (value, superJson) => {
  const transformer = superJson.customTransformerRegistry.findApplicable(value);
  return ["custom", transformer.name];
}, (value, superJson) => {
  const transformer = superJson.customTransformerRegistry.findApplicable(value);
  return transformer.serialize(value);
}, (v2, a2, superJson) => {
  const transformer = superJson.customTransformerRegistry.findByName(a2[1]);
  if (!transformer) {
    throw new Error("Trying to deserialize unknown custom value");
  }
  return transformer.deserialize(v2);
});
var compositeRules = [classRule, symbolRule, customRule, typedArrayRule];
var transformValue = (value, superJson) => {
  const applicableCompositeRule = findArr(compositeRules, (rule) => rule.isApplicable(value, superJson));
  if (applicableCompositeRule) {
    return {
      value: applicableCompositeRule.transform(value, superJson),
      type: applicableCompositeRule.annotation(value, superJson)
    };
  }
  const applicableSimpleRule = findArr(simpleRules, (rule) => rule.isApplicable(value, superJson));
  if (applicableSimpleRule) {
    return {
      value: applicableSimpleRule.transform(value, superJson),
      type: applicableSimpleRule.annotation
    };
  }
  return void 0;
};
var simpleRulesByAnnotation = {};
simpleRules.forEach((rule) => {
  simpleRulesByAnnotation[rule.annotation] = rule;
});
var untransformValue = (json, type, superJson) => {
  if (isArray(type)) {
    switch (type[0]) {
      case "symbol":
        return symbolRule.untransform(json, type, superJson);
      case "class":
        return classRule.untransform(json, type, superJson);
      case "custom":
        return customRule.untransform(json, type, superJson);
      case "typed-array":
        return typedArrayRule.untransform(json, type, superJson);
      default:
        throw new Error("Unknown transformation: " + type);
    }
  } else {
    const transformation = simpleRulesByAnnotation[type];
    if (!transformation) {
      throw new Error("Unknown transformation: " + type);
    }
    return transformation.untransform(json, superJson);
  }
};

// ../../node_modules/.pnpm/superjson@2.2.6/node_modules/superjson/dist/accessDeep.js
var getNthKey = (value, n2) => {
  if (n2 > value.size)
    throw new Error("index out of bounds");
  const keys = value.keys();
  while (n2 > 0) {
    keys.next();
    n2--;
  }
  return keys.next().value;
};
function validatePath(path) {
  if (includes(path, "__proto__")) {
    throw new Error("__proto__ is not allowed as a property");
  }
  if (includes(path, "prototype")) {
    throw new Error("prototype is not allowed as a property");
  }
  if (includes(path, "constructor")) {
    throw new Error("constructor is not allowed as a property");
  }
}
var getDeep = (object, path) => {
  validatePath(path);
  for (let i2 = 0; i2 < path.length; i2++) {
    const key = path[i2];
    if (isSet(object)) {
      object = getNthKey(object, +key);
    } else if (isMap(object)) {
      const row = +key;
      const type = +path[++i2] === 0 ? "key" : "value";
      const keyOfRow = getNthKey(object, row);
      switch (type) {
        case "key":
          object = keyOfRow;
          break;
        case "value":
          object = object.get(keyOfRow);
          break;
      }
    } else {
      object = object[key];
    }
  }
  return object;
};
var setDeep = (object, path, mapper) => {
  validatePath(path);
  if (path.length === 0) {
    return mapper(object);
  }
  let parent = object;
  for (let i2 = 0; i2 < path.length - 1; i2++) {
    const key = path[i2];
    if (isArray(parent)) {
      const index = +key;
      parent = parent[index];
    } else if (isPlainObject(parent)) {
      parent = parent[key];
    } else if (isSet(parent)) {
      const row = +key;
      parent = getNthKey(parent, row);
    } else if (isMap(parent)) {
      const isEnd = i2 === path.length - 2;
      if (isEnd) {
        break;
      }
      const row = +key;
      const type = +path[++i2] === 0 ? "key" : "value";
      const keyOfRow = getNthKey(parent, row);
      switch (type) {
        case "key":
          parent = keyOfRow;
          break;
        case "value":
          parent = parent.get(keyOfRow);
          break;
      }
    }
  }
  const lastKey = path[path.length - 1];
  if (isArray(parent)) {
    parent[+lastKey] = mapper(parent[+lastKey]);
  } else if (isPlainObject(parent)) {
    parent[lastKey] = mapper(parent[lastKey]);
  }
  if (isSet(parent)) {
    const oldValue = getNthKey(parent, +lastKey);
    const newValue = mapper(oldValue);
    if (oldValue !== newValue) {
      parent.delete(oldValue);
      parent.add(newValue);
    }
  }
  if (isMap(parent)) {
    const row = +path[path.length - 2];
    const keyToRow = getNthKey(parent, row);
    const type = +lastKey === 0 ? "key" : "value";
    switch (type) {
      case "key": {
        const newKey = mapper(keyToRow);
        parent.set(newKey, parent.get(keyToRow));
        if (newKey !== keyToRow) {
          parent.delete(keyToRow);
        }
        break;
      }
      case "value": {
        parent.set(keyToRow, mapper(parent.get(keyToRow)));
        break;
      }
    }
  }
  return object;
};

// ../../node_modules/.pnpm/superjson@2.2.6/node_modules/superjson/dist/plainer.js
var enableLegacyPaths = (version) => version < 1;
function traverse(tree, walker2, version, origin = []) {
  if (!tree) {
    return;
  }
  const legacyPaths = enableLegacyPaths(version);
  if (!isArray(tree)) {
    forEach(tree, (subtree, key) => traverse(subtree, walker2, version, [
      ...origin,
      ...parsePath(key, legacyPaths)
    ]));
    return;
  }
  const [nodeValue, children] = tree;
  if (children) {
    forEach(children, (child, key) => {
      traverse(child, walker2, version, [
        ...origin,
        ...parsePath(key, legacyPaths)
      ]);
    });
  }
  walker2(nodeValue, origin);
}
function applyValueAnnotations(plain, annotations, version, superJson) {
  traverse(annotations, (type, path) => {
    plain = setDeep(plain, path, (v2) => untransformValue(v2, type, superJson));
  }, version);
  return plain;
}
function applyReferentialEqualityAnnotations(plain, annotations, version) {
  const legacyPaths = enableLegacyPaths(version);
  function apply(identicalPaths, path) {
    const object = getDeep(plain, parsePath(path, legacyPaths));
    identicalPaths.map((path2) => parsePath(path2, legacyPaths)).forEach((identicalObjectPath) => {
      plain = setDeep(plain, identicalObjectPath, () => object);
    });
  }
  if (isArray(annotations)) {
    const [root, other] = annotations;
    root.forEach((identicalPath) => {
      plain = setDeep(plain, parsePath(identicalPath, legacyPaths), () => plain);
    });
    if (other) {
      forEach(other, apply);
    }
  } else {
    forEach(annotations, apply);
  }
  return plain;
}
var isDeep = (object, superJson) => isPlainObject(object) || isArray(object) || isMap(object) || isSet(object) || isError(object) || isInstanceOfRegisteredClass(object, superJson);
function addIdentity(object, path, identities) {
  const existingSet = identities.get(object);
  if (existingSet) {
    existingSet.push(path);
  } else {
    identities.set(object, [path]);
  }
}
function generateReferentialEqualityAnnotations(identitites, dedupe) {
  const result = {};
  let rootEqualityPaths = void 0;
  identitites.forEach((paths) => {
    if (paths.length <= 1) {
      return;
    }
    if (!dedupe) {
      paths = paths.map((path) => path.map(String)).sort((a2, b2) => a2.length - b2.length);
    }
    const [representativePath, ...identicalPaths] = paths;
    if (representativePath.length === 0) {
      rootEqualityPaths = identicalPaths.map(stringifyPath);
    } else {
      result[stringifyPath(representativePath)] = identicalPaths.map(stringifyPath);
    }
  });
  if (rootEqualityPaths) {
    if (isEmptyObject(result)) {
      return [rootEqualityPaths];
    } else {
      return [rootEqualityPaths, result];
    }
  } else {
    return isEmptyObject(result) ? void 0 : result;
  }
}
var walker = (object, identities, superJson, dedupe, path = [], objectsInThisPath = [], seenObjects = /* @__PURE__ */ new Map()) => {
  const primitive = isPrimitive(object);
  if (!primitive) {
    addIdentity(object, path, identities);
    const seen = seenObjects.get(object);
    if (seen) {
      return dedupe ? {
        transformedValue: null
      } : seen;
    }
  }
  if (!isDeep(object, superJson)) {
    const transformed2 = transformValue(object, superJson);
    const result2 = transformed2 ? {
      transformedValue: transformed2.value,
      annotations: [transformed2.type]
    } : {
      transformedValue: object
    };
    if (!primitive) {
      seenObjects.set(object, result2);
    }
    return result2;
  }
  if (includes(objectsInThisPath, object)) {
    return {
      transformedValue: null
    };
  }
  const transformationResult = transformValue(object, superJson);
  const transformed = transformationResult?.value ?? object;
  const transformedValue = isArray(transformed) ? [] : {};
  const innerAnnotations = {};
  forEach(transformed, (value, index) => {
    if (index === "__proto__" || index === "constructor" || index === "prototype") {
      throw new Error(`Detected property ${index}. This is a prototype pollution risk, please remove it from your object.`);
    }
    const recursiveResult = walker(value, identities, superJson, dedupe, [...path, index], [...objectsInThisPath, object], seenObjects);
    transformedValue[index] = recursiveResult.transformedValue;
    if (isArray(recursiveResult.annotations)) {
      innerAnnotations[escapeKey(index)] = recursiveResult.annotations;
    } else if (isPlainObject(recursiveResult.annotations)) {
      forEach(recursiveResult.annotations, (tree, key) => {
        innerAnnotations[escapeKey(index) + "." + key] = tree;
      });
    }
  });
  const result = isEmptyObject(innerAnnotations) ? {
    transformedValue,
    annotations: !!transformationResult ? [transformationResult.type] : void 0
  } : {
    transformedValue,
    annotations: !!transformationResult ? [transformationResult.type, innerAnnotations] : innerAnnotations
  };
  if (!primitive) {
    seenObjects.set(object, result);
  }
  return result;
};

// ../../node_modules/.pnpm/is-what@5.5.0/node_modules/is-what/dist/getType.js
function getType2(payload) {
  return Object.prototype.toString.call(payload).slice(8, -1);
}

// ../../node_modules/.pnpm/is-what@5.5.0/node_modules/is-what/dist/isArray.js
function isArray2(payload) {
  return getType2(payload) === "Array";
}

// ../../node_modules/.pnpm/is-what@5.5.0/node_modules/is-what/dist/isPlainObject.js
function isPlainObject2(payload) {
  if (getType2(payload) !== "Object")
    return false;
  const prototype = Object.getPrototypeOf(payload);
  return !!prototype && prototype.constructor === Object && prototype === Object.prototype;
}

// ../../node_modules/.pnpm/copy-anything@4.0.5/node_modules/copy-anything/dist/index.js
function assignProp(carry, key, newVal, originalObject, includeNonenumerable) {
  const propType = {}.propertyIsEnumerable.call(originalObject, key) ? "enumerable" : "nonenumerable";
  if (propType === "enumerable")
    carry[key] = newVal;
  if (includeNonenumerable && propType === "nonenumerable") {
    Object.defineProperty(carry, key, {
      value: newVal,
      enumerable: false,
      writable: true,
      configurable: true
    });
  }
}
function copy(target, options = {}) {
  if (isArray2(target)) {
    return target.map((item) => copy(item, options));
  }
  if (!isPlainObject2(target)) {
    return target;
  }
  const props = Object.getOwnPropertyNames(target);
  const symbols = Object.getOwnPropertySymbols(target);
  return [...props, ...symbols].reduce((carry, key) => {
    if (key === "__proto__")
      return carry;
    if (isArray2(options.props) && !options.props.includes(key)) {
      return carry;
    }
    const val = target[key];
    const newVal = copy(val, options);
    assignProp(carry, key, newVal, target, options.nonenumerable);
    return carry;
  }, {});
}

// ../../node_modules/.pnpm/superjson@2.2.6/node_modules/superjson/dist/index.js
var SuperJSON = class {
  /**
   * @param dedupeReferentialEqualities  If true, SuperJSON will make sure only one instance of referentially equal objects are serialized and the rest are replaced with `null`.
   */
  constructor({ dedupe = false } = {}) {
    this.classRegistry = new ClassRegistry();
    this.symbolRegistry = new Registry((s) => s.description ?? "");
    this.customTransformerRegistry = new CustomTransformerRegistry();
    this.allowedErrorProps = [];
    this.dedupe = dedupe;
  }
  serialize(object) {
    const identities = /* @__PURE__ */ new Map();
    const output = walker(object, identities, this, this.dedupe);
    const res = {
      json: output.transformedValue
    };
    if (output.annotations) {
      res.meta = {
        ...res.meta,
        values: output.annotations
      };
    }
    const equalityAnnotations = generateReferentialEqualityAnnotations(identities, this.dedupe);
    if (equalityAnnotations) {
      res.meta = {
        ...res.meta,
        referentialEqualities: equalityAnnotations
      };
    }
    if (res.meta)
      res.meta.v = 1;
    return res;
  }
  deserialize(payload, options) {
    const { json, meta } = payload;
    let result = options?.inPlace ? json : copy(json);
    if (meta?.values) {
      result = applyValueAnnotations(result, meta.values, meta.v ?? 0, this);
    }
    if (meta?.referentialEqualities) {
      result = applyReferentialEqualityAnnotations(result, meta.referentialEqualities, meta.v ?? 0);
    }
    return result;
  }
  stringify(object) {
    return JSON.stringify(this.serialize(object));
  }
  parse(string) {
    return this.deserialize(JSON.parse(string), { inPlace: true });
  }
  registerClass(v2, options) {
    this.classRegistry.register(v2, options);
  }
  registerSymbol(v2, identifier) {
    this.symbolRegistry.register(v2, identifier);
  }
  registerCustom(transformer, name2) {
    this.customTransformerRegistry.register({
      name: name2,
      ...transformer
    });
  }
  allowErrorProps(...props) {
    this.allowedErrorProps.push(...props);
  }
};
SuperJSON.defaultInstance = new SuperJSON();
SuperJSON.serialize = SuperJSON.defaultInstance.serialize.bind(SuperJSON.defaultInstance);
SuperJSON.deserialize = SuperJSON.defaultInstance.deserialize.bind(SuperJSON.defaultInstance);
SuperJSON.stringify = SuperJSON.defaultInstance.stringify.bind(SuperJSON.defaultInstance);
SuperJSON.parse = SuperJSON.defaultInstance.parse.bind(SuperJSON.defaultInstance);
SuperJSON.registerClass = SuperJSON.defaultInstance.registerClass.bind(SuperJSON.defaultInstance);
SuperJSON.registerSymbol = SuperJSON.defaultInstance.registerSymbol.bind(SuperJSON.defaultInstance);
SuperJSON.registerCustom = SuperJSON.defaultInstance.registerCustom.bind(SuperJSON.defaultInstance);
SuperJSON.allowErrorProps = SuperJSON.defaultInstance.allowErrorProps.bind(SuperJSON.defaultInstance);
var dist_default = SuperJSON;
var serialize = SuperJSON.serialize;
var deserialize = SuperJSON.deserialize;
var stringify = SuperJSON.stringify;
var parse = SuperJSON.parse;
var registerClass = SuperJSON.registerClass;
var registerCustom = SuperJSON.registerCustom;
var registerSymbol = SuperJSON.registerSymbol;
var allowErrorProps = SuperJSON.allowErrorProps;

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/imports/superjson.js
dist_default.registerCustom({
  isApplicable: (v2) => typeof Buffer === "function" && Buffer.isBuffer(v2),
  serialize: (v2) => [...v2],
  deserialize: (v2) => Buffer.from(v2)
}, "buffer");
var superjson_default = dist_default;

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/utils/ioSerialization.js
async function parsePacket(value, options) {
  if (!value.data) {
    return void 0;
  }
  switch (value.dataType) {
    case "application/json":
      return JSON.parse(value.data, makeSafeReviver(options));
    case "application/super+json":
      return superjson_default.parse(value.data);
    case "text/plain":
      return value.data;
    case "application/store":
      throw new Error(`Cannot parse an application/store packet (${value.data}). Needs to be imported first.`);
    default:
      return value.data;
  }
}
async function conditionallyImportAndParsePacket(value, client) {
  const importedPacket = await conditionallyImportPacket(value, void 0, client);
  return await parsePacket(importedPacket);
}
async function stringifyIO(value) {
  if (value === void 0) {
    return { dataType: "application/json" };
  }
  if (typeof value === "string") {
    return { data: value, dataType: "text/plain" };
  }
  try {
    const data = superjson_default.stringify(value);
    return { data, dataType: "application/super+json" };
  } catch {
    return { data: value, dataType: "application/json" };
  }
}
var ioRetryOptions = {
  minTimeoutInMs: 500,
  maxTimeoutInMs: 5e3,
  maxAttempts: 5,
  factor: 2,
  randomize: true
};
async function conditionallyImportPacket(packet, tracer2, client) {
  if (packet.dataType !== "application/store") {
    return packet;
  }
  if (!tracer2) {
    return await importPacket(packet, void 0, client);
  } else {
    const result = await tracer2.startActiveSpan("store.downloadPayload", async (span) => {
      return await importPacket(packet, span, client);
    }, {
      attributes: {
        [SemanticInternalAttributes.STYLE_ICON]: "cloud-download"
      }
    });
    return result ?? packet;
  }
}
async function importPacket(packet, span, client) {
  if (!packet.data) {
    return packet;
  }
  const $client = client ?? apiClientManager.client;
  if (!$client) {
    return packet;
  }
  const presignedResponse = await $client.getPayloadUrl(packet.data);
  const response = await zodfetch(external_exports.any(), presignedResponse.presignedUrl, void 0, {
    retry: ioRetryOptions
  }).asResponse();
  if (!response.ok) {
    throw new Error(`Failed to import packet ${presignedResponse.presignedUrl}: ${response.statusText}`);
  }
  const data = await response.text();
  span?.setAttribute("size", Buffer.byteLength(data, "utf8"));
  return {
    data,
    dataType: response.headers.get("content-type") ?? "application/json"
  };
}
function makeSafeReviver(options) {
  if (!options) {
    return void 0;
  }
  return function reviver(key, value) {
    if (options?.filteredKeys?.includes(key)) {
      return void 0;
    }
    return value;
  };
}

// ../../node_modules/.pnpm/@microsoft+fetch-event-source@2.0.1/node_modules/@microsoft/fetch-event-source/lib/esm/parse.js
async function getBytes(stream2, onChunk) {
  const reader = stream2.getReader();
  let result;
  while (!(result = await reader.read()).done) {
    onChunk(result.value);
  }
}
function getLines(onLine) {
  let buffer;
  let position;
  let fieldLength;
  let discardTrailingNewline = false;
  return function onChunk(arr) {
    if (buffer === void 0) {
      buffer = arr;
      position = 0;
      fieldLength = -1;
    } else {
      buffer = concat(buffer, arr);
    }
    const bufLength = buffer.length;
    let lineStart = 0;
    while (position < bufLength) {
      if (discardTrailingNewline) {
        if (buffer[position] === 10) {
          lineStart = ++position;
        }
        discardTrailingNewline = false;
      }
      let lineEnd = -1;
      for (; position < bufLength && lineEnd === -1; ++position) {
        switch (buffer[position]) {
          case 58:
            if (fieldLength === -1) {
              fieldLength = position - lineStart;
            }
            break;
          case 13:
            discardTrailingNewline = true;
          case 10:
            lineEnd = position;
            break;
        }
      }
      if (lineEnd === -1) {
        break;
      }
      onLine(buffer.subarray(lineStart, lineEnd), fieldLength);
      lineStart = position;
      fieldLength = -1;
    }
    if (lineStart === bufLength) {
      buffer = void 0;
    } else if (lineStart !== 0) {
      buffer = buffer.subarray(lineStart);
      position -= lineStart;
    }
  };
}
function getMessages(onId, onRetry, onMessage) {
  let message = newMessage();
  const decoder = new TextDecoder();
  return function onLine(line, fieldLength) {
    if (line.length === 0) {
      onMessage === null || onMessage === void 0 ? void 0 : onMessage(message);
      message = newMessage();
    } else if (fieldLength > 0) {
      const field = decoder.decode(line.subarray(0, fieldLength));
      const valueOffset = fieldLength + (line[fieldLength + 1] === 32 ? 2 : 1);
      const value = decoder.decode(line.subarray(valueOffset));
      switch (field) {
        case "data":
          message.data = message.data ? message.data + "\n" + value : value;
          break;
        case "event":
          message.event = value;
          break;
        case "id":
          onId(message.id = value);
          break;
        case "retry":
          const retry2 = parseInt(value, 10);
          if (!isNaN(retry2)) {
            onRetry(message.retry = retry2);
          }
          break;
      }
    }
  };
}
function concat(a2, b2) {
  const res = new Uint8Array(a2.length + b2.length);
  res.set(a2);
  res.set(b2, a2.length);
  return res;
}
function newMessage() {
  return {
    data: "",
    event: "",
    id: "",
    retry: void 0
  };
}

// ../../node_modules/.pnpm/@microsoft+fetch-event-source@2.0.1/node_modules/@microsoft/fetch-event-source/lib/esm/fetch.js
var __rest = function(s, e) {
  var t2 = {};
  for (var p2 in s) if (Object.prototype.hasOwnProperty.call(s, p2) && e.indexOf(p2) < 0)
    t2[p2] = s[p2];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i2 = 0, p2 = Object.getOwnPropertySymbols(s); i2 < p2.length; i2++) {
      if (e.indexOf(p2[i2]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p2[i2]))
        t2[p2[i2]] = s[p2[i2]];
    }
  return t2;
};
var EventStreamContentType = "text/event-stream";
var DefaultRetryInterval = 1e3;
var LastEventId = "last-event-id";
function fetchEventSource(input, _a) {
  var { signal: inputSignal, headers: inputHeaders, onopen: inputOnOpen, onmessage, onclose, onerror, openWhenHidden, fetch: inputFetch } = _a, rest = __rest(_a, ["signal", "headers", "onopen", "onmessage", "onclose", "onerror", "openWhenHidden", "fetch"]);
  return new Promise((resolve, reject) => {
    const headers = Object.assign({}, inputHeaders);
    if (!headers.accept) {
      headers.accept = EventStreamContentType;
    }
    let curRequestController;
    function onVisibilityChange() {
      curRequestController.abort();
      if (!document.hidden) {
        create();
      }
    }
    if (!openWhenHidden) {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    let retryInterval = DefaultRetryInterval;
    let retryTimer = 0;
    function dispose() {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearTimeout(retryTimer);
      curRequestController.abort();
    }
    inputSignal === null || inputSignal === void 0 ? void 0 : inputSignal.addEventListener("abort", () => {
      dispose();
      resolve();
    });
    const fetch2 = inputFetch !== null && inputFetch !== void 0 ? inputFetch : window.fetch;
    const onopen = inputOnOpen !== null && inputOnOpen !== void 0 ? inputOnOpen : defaultOnOpen;
    async function create() {
      var _a2;
      curRequestController = new AbortController();
      try {
        const response = await fetch2(input, Object.assign(Object.assign({}, rest), { headers, signal: curRequestController.signal }));
        await onopen(response);
        await getBytes(response.body, getLines(getMessages((id) => {
          if (id) {
            headers[LastEventId] = id;
          } else {
            delete headers[LastEventId];
          }
        }, (retry2) => {
          retryInterval = retry2;
        }, onmessage)));
        onclose === null || onclose === void 0 ? void 0 : onclose();
        dispose();
        resolve();
      } catch (err) {
        if (!curRequestController.signal.aborted) {
          try {
            const interval = (_a2 = onerror === null || onerror === void 0 ? void 0 : onerror(err)) !== null && _a2 !== void 0 ? _a2 : retryInterval;
            window.clearTimeout(retryTimer);
            retryTimer = window.setTimeout(create, interval);
          } catch (innerErr) {
            dispose();
            reject(innerErr);
          }
        }
      }
    }
    create();
  });
}
function defaultOnOpen(response) {
  const contentType = response.headers.get("content-type");
  if (!(contentType === null || contentType === void 0 ? void 0 : contentType.startsWith(EventStreamContentType))) {
    throw new Error(`Expected content-type to be ${EventStreamContentType}, Actual: ${contentType}`);
  }
}

// ../../node_modules/.pnpm/@electric-sql+client@1.0.14/node_modules/@electric-sql/client/dist/index.mjs
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a2, b2) => {
  for (var prop in b2 || (b2 = {}))
    if (__hasOwnProp.call(b2, prop))
      __defNormalProp(a2, prop, b2[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b2)) {
      if (__propIsEnum.call(b2, prop))
        __defNormalProp(a2, prop, b2[prop]);
    }
  return a2;
};
var __spreadProps = (a2, b2) => __defProps(a2, __getOwnPropDescs(b2));
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var FetchError = class _FetchError extends Error {
  constructor(status, text, json, headers, url, message) {
    super(
      message || `HTTP Error ${status} at ${url}: ${text != null ? text : JSON.stringify(json)}`
    );
    this.url = url;
    this.name = `FetchError`;
    this.status = status;
    this.text = text;
    this.json = json;
    this.headers = headers;
  }
  static fromResponse(response, url) {
    return __async(this, null, function* () {
      const status = response.status;
      const headers = Object.fromEntries([...response.headers.entries()]);
      let text = void 0;
      let json = void 0;
      const contentType = response.headers.get(`content-type`);
      if (!response.bodyUsed) {
        if (contentType && contentType.includes(`application/json`)) {
          json = yield response.json();
        } else {
          text = yield response.text();
        }
      }
      return new _FetchError(status, text, json, headers, url);
    });
  }
};
var FetchBackoffAbortError = class extends Error {
  constructor() {
    super(`Fetch with backoff aborted`);
    this.name = `FetchBackoffAbortError`;
  }
};
var MissingShapeUrlError = class extends Error {
  constructor() {
    super(`Invalid shape options: missing required url parameter`);
    this.name = `MissingShapeUrlError`;
  }
};
var InvalidSignalError = class extends Error {
  constructor() {
    super(`Invalid signal option. It must be an instance of AbortSignal.`);
    this.name = `InvalidSignalError`;
  }
};
var MissingShapeHandleError = class extends Error {
  constructor() {
    super(
      `shapeHandle is required if this isn't an initial fetch (i.e. offset > -1)`
    );
    this.name = `MissingShapeHandleError`;
  }
};
var ReservedParamError = class extends Error {
  constructor(reservedParams) {
    super(
      `Cannot use reserved Electric parameter names in custom params: ${reservedParams.join(`, `)}`
    );
    this.name = `ReservedParamError`;
  }
};
var ParserNullValueError = class extends Error {
  constructor(columnName) {
    super(`Column "${columnName != null ? columnName : `unknown`}" does not allow NULL values`);
    this.name = `ParserNullValueError`;
  }
};
var MissingHeadersError = class extends Error {
  constructor(url, missingHeaders) {
    let msg = `The response for the shape request to ${url} didn't include the following required headers:
`;
    missingHeaders.forEach((h) => {
      msg += `- ${h}
`;
    });
    msg += `
This is often due to a proxy not setting CORS correctly so that all Electric headers can be read by the client.`;
    msg += `
For more information visit the troubleshooting guide: /docs/guides/troubleshooting/missing-headers`;
    super(msg);
  }
};
var parseNumber = (value) => Number(value);
var parseBool = (value) => value === `true` || value === `t`;
var parseBigInt = (value) => BigInt(value);
var parseJson = (value) => JSON.parse(value);
var identityParser = (v2) => v2;
var defaultParser = {
  int2: parseNumber,
  int4: parseNumber,
  int8: parseBigInt,
  bool: parseBool,
  float4: parseNumber,
  float8: parseNumber,
  json: parseJson,
  jsonb: parseJson
};
function pgArrayParser(value, parser) {
  let i2 = 0;
  let char = null;
  let str = ``;
  let quoted = false;
  let last = 0;
  let p2 = void 0;
  function extractValue(x, start, end) {
    let val = x.slice(start, end);
    val = val === `NULL` ? null : val;
    return parser ? parser(val) : val;
  }
  function loop(x) {
    const xs = [];
    for (; i2 < x.length; i2++) {
      char = x[i2];
      if (quoted) {
        if (char === `\\`) {
          str += x[++i2];
        } else if (char === `"`) {
          xs.push(parser ? parser(str) : str);
          str = ``;
          quoted = x[i2 + 1] === `"`;
          last = i2 + 2;
        } else {
          str += char;
        }
      } else if (char === `"`) {
        quoted = true;
      } else if (char === `{`) {
        last = ++i2;
        xs.push(loop(x));
      } else if (char === `}`) {
        quoted = false;
        last < i2 && xs.push(extractValue(x, last, i2));
        last = i2 + 1;
        break;
      } else if (char === `,` && p2 !== `}` && p2 !== `"`) {
        xs.push(extractValue(x, last, i2));
        last = i2 + 1;
      }
      p2 = char;
    }
    last < i2 && xs.push(xs.push(extractValue(x, last, i2 + 1)));
    return xs;
  }
  return loop(value)[0];
}
var MessageParser = class {
  constructor(parser, transformer) {
    this.parser = __spreadValues(__spreadValues({}, defaultParser), parser);
    this.transformer = transformer;
  }
  parse(messages, schema) {
    return JSON.parse(messages, (key, value) => {
      if ((key === `value` || key === `old_value`) && typeof value === `object` && value !== null) {
        const row = value;
        Object.keys(row).forEach((key2) => {
          row[key2] = this.parseRow(key2, row[key2], schema);
        });
        if (this.transformer) value = this.transformer(value);
      }
      return value;
    });
  }
  // Parses the message values using the provided parser based on the schema information
  parseRow(key, value, schema) {
    var _b;
    const columnInfo = schema[key];
    if (!columnInfo) {
      return value;
    }
    const _a = columnInfo, { type: typ, dims: dimensions } = _a, additionalInfo = __objRest(_a, ["type", "dims"]);
    const typeParser = (_b = this.parser[typ]) != null ? _b : identityParser;
    const parser = makeNullableParser(typeParser, columnInfo, key);
    if (dimensions && dimensions > 0) {
      const nullablePgArrayParser = makeNullableParser(
        (value2, _2) => pgArrayParser(value2, parser),
        columnInfo,
        key
      );
      return nullablePgArrayParser(value);
    }
    return parser(value, additionalInfo);
  }
};
function makeNullableParser(parser, columnInfo, columnName) {
  var _a;
  const isNullable = !((_a = columnInfo.not_null) != null ? _a : false);
  return (value) => {
    if (value === null) {
      if (!isNullable) {
        throw new ParserNullValueError(columnName != null ? columnName : `unknown`);
      }
      return null;
    }
    return parser(value, columnInfo);
  };
}
function isChangeMessage(message) {
  return `key` in message;
}
function isControlMessage(message) {
  return !isChangeMessage(message);
}
function isUpToDateMessage(message) {
  return isControlMessage(message) && message.headers.control === `up-to-date`;
}
function getOffset(message) {
  const lsn = message.headers.global_last_seen_lsn;
  if (!lsn) {
    return;
  }
  return `${lsn}_0`;
}
function isVisibleInSnapshot(txid, snapshot) {
  const xid = BigInt(txid);
  const xmin = BigInt(snapshot.xmin);
  const xmax = BigInt(snapshot.xmax);
  const xip = snapshot.xip_list.map(BigInt);
  return xid < xmin || xid < xmax && !xip.includes(xid);
}
var LIVE_CACHE_BUSTER_HEADER = `electric-cursor`;
var SHAPE_HANDLE_HEADER = `electric-handle`;
var CHUNK_LAST_OFFSET_HEADER = `electric-offset`;
var SHAPE_SCHEMA_HEADER = `electric-schema`;
var CHUNK_UP_TO_DATE_HEADER = `electric-up-to-date`;
var COLUMNS_QUERY_PARAM = `columns`;
var LIVE_CACHE_BUSTER_QUERY_PARAM = `cursor`;
var EXPIRED_HANDLE_QUERY_PARAM = `expired_handle`;
var SHAPE_HANDLE_QUERY_PARAM = `handle`;
var LIVE_QUERY_PARAM = `live`;
var OFFSET_QUERY_PARAM = `offset`;
var TABLE_QUERY_PARAM = `table`;
var WHERE_QUERY_PARAM = `where`;
var REPLICA_PARAM = `replica`;
var WHERE_PARAMS_PARAM = `params`;
var EXPERIMENTAL_LIVE_SSE_QUERY_PARAM = `experimental_live_sse`;
var FORCE_DISCONNECT_AND_REFRESH = `force-disconnect-and-refresh`;
var PAUSE_STREAM = `pause-stream`;
var LOG_MODE_QUERY_PARAM = `log`;
var SUBSET_PARAM_WHERE = `subset__where`;
var SUBSET_PARAM_LIMIT = `subset__limit`;
var SUBSET_PARAM_OFFSET = `subset__offset`;
var SUBSET_PARAM_ORDER_BY = `subset__order_by`;
var SUBSET_PARAM_WHERE_PARAMS = `subset__params`;
var ELECTRIC_PROTOCOL_QUERY_PARAMS = [
  LIVE_QUERY_PARAM,
  SHAPE_HANDLE_QUERY_PARAM,
  OFFSET_QUERY_PARAM,
  LIVE_CACHE_BUSTER_QUERY_PARAM,
  EXPIRED_HANDLE_QUERY_PARAM,
  LOG_MODE_QUERY_PARAM,
  SUBSET_PARAM_WHERE,
  SUBSET_PARAM_LIMIT,
  SUBSET_PARAM_OFFSET,
  SUBSET_PARAM_ORDER_BY,
  SUBSET_PARAM_WHERE_PARAMS
];
var HTTP_RETRY_STATUS_CODES = [429];
var BackoffDefaults = {
  initialDelay: 100,
  maxDelay: 1e4,
  multiplier: 1.3
};
function createFetchWithBackoff(fetchClient, backoffOptions = BackoffDefaults) {
  const {
    initialDelay,
    maxDelay,
    multiplier,
    debug = false,
    onFailedAttempt
  } = backoffOptions;
  return (...args) => __async(this, null, function* () {
    var _a;
    const url = args[0];
    const options = args[1];
    let delay = initialDelay;
    let attempt = 0;
    while (true) {
      try {
        const result = yield fetchClient(...args);
        if (result.ok) return result;
        const err = yield FetchError.fromResponse(result, url.toString());
        throw err;
      } catch (e) {
        onFailedAttempt == null ? void 0 : onFailedAttempt();
        if ((_a = options == null ? void 0 : options.signal) == null ? void 0 : _a.aborted) {
          throw new FetchBackoffAbortError();
        } else if (e instanceof FetchError && !HTTP_RETRY_STATUS_CODES.includes(e.status) && e.status >= 400 && e.status < 500) {
          throw e;
        } else {
          yield new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * multiplier, maxDelay);
          if (debug) {
            attempt++;
            console.log(`Retry attempt #${attempt} after ${delay}ms`);
          }
        }
      }
    }
  });
}
var NO_BODY_STATUS_CODES = [201, 204, 205];
function createFetchWithConsumedMessages(fetchClient) {
  return (...args) => __async(this, null, function* () {
    const url = args[0];
    const res = yield fetchClient(...args);
    try {
      if (res.status < 200 || NO_BODY_STATUS_CODES.includes(res.status)) {
        return res;
      }
      const text = yield res.text();
      return new Response(text, res);
    } catch (err) {
      throw new FetchError(
        res.status,
        void 0,
        void 0,
        Object.fromEntries([...res.headers.entries()]),
        url.toString(),
        err instanceof Error ? err.message : typeof err === `string` ? err : `failed to read body`
      );
    }
  });
}
var ChunkPrefetchDefaults = {
  maxChunksToPrefetch: 2
};
function createFetchWithChunkBuffer(fetchClient, prefetchOptions = ChunkPrefetchDefaults) {
  const { maxChunksToPrefetch } = prefetchOptions;
  let prefetchQueue;
  const prefetchClient = (...args) => __async(this, null, function* () {
    const url = args[0].toString();
    const prefetchedRequest = prefetchQueue == null ? void 0 : prefetchQueue.consume(...args);
    if (prefetchedRequest) {
      return prefetchedRequest;
    }
    prefetchQueue == null ? void 0 : prefetchQueue.abort();
    const response = yield fetchClient(...args);
    const nextUrl = getNextChunkUrl(url, response);
    if (nextUrl) {
      prefetchQueue = new PrefetchQueue({
        fetchClient,
        maxPrefetchedRequests: maxChunksToPrefetch,
        url: nextUrl,
        requestInit: args[1]
      });
    }
    return response;
  });
  return prefetchClient;
}
var requiredElectricResponseHeaders = [
  `electric-offset`,
  `electric-handle`
];
var requiredLiveResponseHeaders = [`electric-cursor`];
var requiredNonLiveResponseHeaders = [`electric-schema`];
function createFetchWithResponseHeadersCheck(fetchClient) {
  return (...args) => __async(this, null, function* () {
    const response = yield fetchClient(...args);
    if (response.ok) {
      const headers = response.headers;
      const missingHeaders = [];
      const addMissingHeaders = (requiredHeaders) => missingHeaders.push(...requiredHeaders.filter((h) => !headers.has(h)));
      const input = args[0];
      const urlString = input.toString();
      const url = new URL(urlString);
      const isSnapshotRequest = [
        SUBSET_PARAM_WHERE,
        SUBSET_PARAM_WHERE_PARAMS,
        SUBSET_PARAM_LIMIT,
        SUBSET_PARAM_OFFSET,
        SUBSET_PARAM_ORDER_BY
      ].some((p2) => url.searchParams.has(p2));
      if (isSnapshotRequest) {
        return response;
      }
      addMissingHeaders(requiredElectricResponseHeaders);
      if (url.searchParams.get(LIVE_QUERY_PARAM) === `true`) {
        addMissingHeaders(requiredLiveResponseHeaders);
      }
      if (!url.searchParams.has(LIVE_QUERY_PARAM) || url.searchParams.get(LIVE_QUERY_PARAM) === `false`) {
        addMissingHeaders(requiredNonLiveResponseHeaders);
      }
      if (missingHeaders.length > 0) {
        throw new MissingHeadersError(urlString, missingHeaders);
      }
    }
    return response;
  });
}
var _fetchClient;
var _maxPrefetchedRequests;
var _prefetchQueue;
var _queueHeadUrl;
var _queueTailUrl;
var _PrefetchQueue_instances;
var prefetch_fn;
var PrefetchQueue = class {
  constructor(options) {
    __privateAdd(this, _PrefetchQueue_instances);
    __privateAdd(this, _fetchClient);
    __privateAdd(this, _maxPrefetchedRequests);
    __privateAdd(this, _prefetchQueue, /* @__PURE__ */ new Map());
    __privateAdd(this, _queueHeadUrl);
    __privateAdd(this, _queueTailUrl);
    var _a;
    __privateSet(this, _fetchClient, (_a = options.fetchClient) != null ? _a : (...args) => fetch(...args));
    __privateSet(this, _maxPrefetchedRequests, options.maxPrefetchedRequests);
    __privateSet(this, _queueHeadUrl, options.url.toString());
    __privateSet(this, _queueTailUrl, __privateGet(this, _queueHeadUrl));
    __privateMethod(this, _PrefetchQueue_instances, prefetch_fn).call(this, options.url, options.requestInit);
  }
  abort() {
    __privateGet(this, _prefetchQueue).forEach(([_2, aborter]) => aborter.abort());
  }
  consume(...args) {
    var _a;
    const url = args[0].toString();
    const request = (_a = __privateGet(this, _prefetchQueue).get(url)) == null ? void 0 : _a[0];
    if (!request || url !== __privateGet(this, _queueHeadUrl)) return;
    __privateGet(this, _prefetchQueue).delete(url);
    request.then((response) => {
      const nextUrl = getNextChunkUrl(url, response);
      __privateSet(this, _queueHeadUrl, nextUrl);
      if (__privateGet(this, _queueTailUrl) && !__privateGet(this, _prefetchQueue).has(__privateGet(this, _queueTailUrl))) {
        __privateMethod(this, _PrefetchQueue_instances, prefetch_fn).call(this, __privateGet(this, _queueTailUrl), args[1]);
      }
    }).catch(() => {
    });
    return request;
  }
};
_fetchClient = /* @__PURE__ */ new WeakMap();
_maxPrefetchedRequests = /* @__PURE__ */ new WeakMap();
_prefetchQueue = /* @__PURE__ */ new WeakMap();
_queueHeadUrl = /* @__PURE__ */ new WeakMap();
_queueTailUrl = /* @__PURE__ */ new WeakMap();
_PrefetchQueue_instances = /* @__PURE__ */ new WeakSet();
prefetch_fn = function(...args) {
  var _a, _b;
  const url = args[0].toString();
  if (__privateGet(this, _prefetchQueue).size >= __privateGet(this, _maxPrefetchedRequests)) return;
  const aborter = new AbortController();
  try {
    const { signal, cleanup } = chainAborter(aborter, (_a = args[1]) == null ? void 0 : _a.signal);
    const request = __privateGet(this, _fetchClient).call(this, url, __spreadProps(__spreadValues({}, (_b = args[1]) != null ? _b : {}), { signal }));
    __privateGet(this, _prefetchQueue).set(url, [request, aborter]);
    request.then((response) => {
      if (!response.ok || aborter.signal.aborted) return;
      const nextUrl = getNextChunkUrl(url, response);
      if (!nextUrl || nextUrl === url) {
        __privateSet(this, _queueTailUrl, void 0);
        return;
      }
      __privateSet(this, _queueTailUrl, nextUrl);
      return __privateMethod(this, _PrefetchQueue_instances, prefetch_fn).call(this, nextUrl, args[1]);
    }).catch(() => {
    }).finally(cleanup);
  } catch (_2) {
  }
};
function getNextChunkUrl(url, res) {
  const shapeHandle = res.headers.get(SHAPE_HANDLE_HEADER);
  const lastOffset = res.headers.get(CHUNK_LAST_OFFSET_HEADER);
  const isUpToDate = res.headers.has(CHUNK_UP_TO_DATE_HEADER);
  if (!shapeHandle || !lastOffset || isUpToDate) return;
  const nextUrl = new URL(url);
  if (nextUrl.searchParams.has(LIVE_QUERY_PARAM)) return;
  nextUrl.searchParams.set(SHAPE_HANDLE_QUERY_PARAM, shapeHandle);
  nextUrl.searchParams.set(OFFSET_QUERY_PARAM, lastOffset);
  nextUrl.searchParams.sort();
  return nextUrl.toString();
}
function chainAborter(aborter, sourceSignal) {
  let cleanup = noop2;
  if (!sourceSignal) {
  } else if (sourceSignal.aborted) {
    aborter.abort();
  } else {
    const abortParent = () => aborter.abort();
    sourceSignal.addEventListener(`abort`, abortParent, {
      once: true,
      signal: aborter.signal
    });
    cleanup = () => sourceSignal.removeEventListener(`abort`, abortParent);
  }
  return {
    signal: aborter.signal,
    cleanup
  };
}
function noop2() {
}
var ExpiredShapesCache = class {
  constructor() {
    this.data = {};
    this.max = 250;
    this.storageKey = `electric_expired_shapes`;
    this.load();
  }
  getExpiredHandle(shapeUrl) {
    const entry = this.data[shapeUrl];
    if (entry) {
      entry.lastUsed = Date.now();
      this.save();
      return entry.expiredHandle;
    }
    return null;
  }
  markExpired(shapeUrl, handle) {
    this.data[shapeUrl] = { expiredHandle: handle, lastUsed: Date.now() };
    const keys = Object.keys(this.data);
    if (keys.length > this.max) {
      const oldest = keys.reduce(
        (min, k) => this.data[k].lastUsed < this.data[min].lastUsed ? k : min
      );
      delete this.data[oldest];
    }
    this.save();
  }
  save() {
    if (typeof localStorage === `undefined`) return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
    }
  }
  load() {
    if (typeof localStorage === `undefined`) return;
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.data = JSON.parse(stored);
      }
    } catch (e) {
      this.data = {};
    }
  }
  clear() {
    this.data = {};
    this.save();
  }
};
var expiredShapesCache = new ExpiredShapesCache();
var SnapshotTracker = class {
  constructor() {
    this.activeSnapshots = /* @__PURE__ */ new Map();
    this.xmaxSnapshots = /* @__PURE__ */ new Map();
    this.snapshotsByDatabaseLsn = /* @__PURE__ */ new Map();
  }
  /**
   * Add a new snapshot for tracking
   */
  addSnapshot(metadata2, keys) {
    var _a, _b, _c, _d;
    this.activeSnapshots.set(metadata2.snapshot_mark, {
      xmin: BigInt(metadata2.xmin),
      xmax: BigInt(metadata2.xmax),
      xip_list: metadata2.xip_list.map(BigInt),
      keys
    });
    const xmaxSet = (_b = (_a = this.xmaxSnapshots.get(BigInt(metadata2.xmax))) == null ? void 0 : _a.add(metadata2.snapshot_mark)) != null ? _b : /* @__PURE__ */ new Set([metadata2.snapshot_mark]);
    this.xmaxSnapshots.set(BigInt(metadata2.xmax), xmaxSet);
    const databaseLsnSet = (_d = (_c = this.snapshotsByDatabaseLsn.get(BigInt(metadata2.database_lsn))) == null ? void 0 : _c.add(metadata2.snapshot_mark)) != null ? _d : /* @__PURE__ */ new Set([metadata2.snapshot_mark]);
    this.snapshotsByDatabaseLsn.set(
      BigInt(metadata2.database_lsn),
      databaseLsnSet
    );
  }
  /**
   * Remove a snapshot from tracking
   */
  removeSnapshot(snapshotMark) {
    this.activeSnapshots.delete(snapshotMark);
  }
  /**
   * Check if a change message should be filtered because its already in an active snapshot
   * Returns true if the message should be filtered out (not processed)
   */
  shouldRejectMessage(message) {
    const txids = message.headers.txids || [];
    if (txids.length === 0) return false;
    const xid = Math.max(...txids);
    for (const [xmax, snapshots] of this.xmaxSnapshots.entries()) {
      if (xid >= xmax) {
        for (const snapshot of snapshots) {
          this.removeSnapshot(snapshot);
        }
      }
    }
    return [...this.activeSnapshots.values()].some(
      (x) => x.keys.has(message.key) && isVisibleInSnapshot(xid, x)
    );
  }
  lastSeenUpdate(newDatabaseLsn) {
    for (const [dbLsn, snapshots] of this.snapshotsByDatabaseLsn.entries()) {
      if (dbLsn <= newDatabaseLsn) {
        for (const snapshot of snapshots) {
          this.removeSnapshot(snapshot);
        }
      }
    }
  }
};
var RESERVED_PARAMS = /* @__PURE__ */ new Set([
  LIVE_CACHE_BUSTER_QUERY_PARAM,
  SHAPE_HANDLE_QUERY_PARAM,
  LIVE_QUERY_PARAM,
  OFFSET_QUERY_PARAM
]);
function resolveValue(value) {
  return __async(this, null, function* () {
    if (typeof value === `function`) {
      return value();
    }
    return value;
  });
}
function toInternalParams(params) {
  return __async(this, null, function* () {
    const entries = Object.entries(params);
    const resolvedEntries = yield Promise.all(
      entries.map((_0) => __async(this, [_0], function* ([key, value]) {
        if (value === void 0) return [key, void 0];
        const resolvedValue = yield resolveValue(value);
        return [
          key,
          Array.isArray(resolvedValue) ? resolvedValue.join(`,`) : resolvedValue
        ];
      }))
    );
    return Object.fromEntries(
      resolvedEntries.filter(([_2, value]) => value !== void 0)
    );
  });
}
function resolveHeaders(headers) {
  return __async(this, null, function* () {
    if (!headers) return {};
    const entries = Object.entries(headers);
    const resolvedEntries = yield Promise.all(
      entries.map((_0) => __async(this, [_0], function* ([key, value]) {
        return [key, yield resolveValue(value)];
      }))
    );
    return Object.fromEntries(resolvedEntries);
  });
}
function canonicalShapeKey(url) {
  const cleanUrl = new URL(url.origin + url.pathname);
  for (const [key, value] of url.searchParams) {
    if (!ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
      cleanUrl.searchParams.set(key, value);
    }
  }
  cleanUrl.searchParams.sort();
  return cleanUrl.toString();
}
var _error;
var _fetchClient2;
var _sseFetchClient;
var _messageParser;
var _subscribers;
var _started;
var _state;
var _lastOffset;
var _liveCacheBuster;
var _lastSyncedAt;
var _isUpToDate;
var _isMidStream;
var _connected;
var _shapeHandle;
var _mode;
var _schema;
var _onError;
var _requestAbortController;
var _isRefreshing;
var _tickPromise;
var _tickPromiseResolver;
var _tickPromiseRejecter;
var _messageChain;
var _snapshotTracker;
var _activeSnapshotRequests;
var _midStreamPromise;
var _midStreamPromiseResolver;
var _ShapeStream_instances;
var start_fn;
var requestShape_fn;
var constructUrl_fn;
var createAbortListener_fn;
var onInitialResponse_fn;
var onMessages_fn;
var fetchShape_fn;
var requestShapeLongPoll_fn;
var requestShapeSSE_fn;
var pause_fn;
var resume_fn;
var nextTick_fn;
var waitForStreamEnd_fn;
var publish_fn;
var sendErrorToSubscribers_fn;
var subscribeToVisibilityChanges_fn;
var reset_fn;
var fetchSnapshot_fn;
var ShapeStream = class {
  constructor(options) {
    __privateAdd(this, _ShapeStream_instances);
    __privateAdd(this, _error, null);
    __privateAdd(this, _fetchClient2);
    __privateAdd(this, _sseFetchClient);
    __privateAdd(this, _messageParser);
    __privateAdd(this, _subscribers, /* @__PURE__ */ new Map());
    __privateAdd(this, _started, false);
    __privateAdd(this, _state, `active`);
    __privateAdd(this, _lastOffset);
    __privateAdd(this, _liveCacheBuster);
    __privateAdd(this, _lastSyncedAt);
    __privateAdd(this, _isUpToDate, false);
    __privateAdd(this, _isMidStream, true);
    __privateAdd(this, _connected, false);
    __privateAdd(this, _shapeHandle);
    __privateAdd(this, _mode);
    __privateAdd(this, _schema);
    __privateAdd(this, _onError);
    __privateAdd(this, _requestAbortController);
    __privateAdd(this, _isRefreshing, false);
    __privateAdd(this, _tickPromise);
    __privateAdd(this, _tickPromiseResolver);
    __privateAdd(this, _tickPromiseRejecter);
    __privateAdd(this, _messageChain, Promise.resolve([]));
    __privateAdd(this, _snapshotTracker, new SnapshotTracker());
    __privateAdd(this, _activeSnapshotRequests, 0);
    __privateAdd(this, _midStreamPromise);
    __privateAdd(this, _midStreamPromiseResolver);
    var _a, _b, _c, _d;
    this.options = __spreadValues({ subscribe: true }, options);
    validateOptions(this.options);
    __privateSet(this, _lastOffset, (_a = this.options.offset) != null ? _a : `-1`);
    __privateSet(this, _liveCacheBuster, ``);
    __privateSet(this, _shapeHandle, this.options.handle);
    __privateSet(this, _messageParser, new MessageParser(
      options.parser,
      options.transformer
    ));
    __privateSet(this, _onError, this.options.onError);
    __privateSet(this, _mode, (_b = this.options.log) != null ? _b : `full`);
    const baseFetchClient = (_c = options.fetchClient) != null ? _c : (...args) => fetch(...args);
    const backOffOpts = __spreadProps(__spreadValues({}, (_d = options.backoffOptions) != null ? _d : BackoffDefaults), {
      onFailedAttempt: () => {
        var _a2, _b2;
        __privateSet(this, _connected, false);
        (_b2 = (_a2 = options.backoffOptions) == null ? void 0 : _a2.onFailedAttempt) == null ? void 0 : _b2.call(_a2);
      }
    });
    const fetchWithBackoffClient = createFetchWithBackoff(
      baseFetchClient,
      backOffOpts
    );
    __privateSet(this, _sseFetchClient, createFetchWithResponseHeadersCheck(
      createFetchWithChunkBuffer(fetchWithBackoffClient)
    ));
    __privateSet(this, _fetchClient2, createFetchWithConsumedMessages(__privateGet(this, _sseFetchClient)));
    __privateMethod(this, _ShapeStream_instances, subscribeToVisibilityChanges_fn).call(this);
  }
  get shapeHandle() {
    return __privateGet(this, _shapeHandle);
  }
  get error() {
    return __privateGet(this, _error);
  }
  get isUpToDate() {
    return __privateGet(this, _isUpToDate);
  }
  get lastOffset() {
    return __privateGet(this, _lastOffset);
  }
  get mode() {
    return __privateGet(this, _mode);
  }
  subscribe(callback, onError = () => {
  }) {
    const subscriptionId = Math.random();
    __privateGet(this, _subscribers).set(subscriptionId, [callback, onError]);
    if (!__privateGet(this, _started)) __privateMethod(this, _ShapeStream_instances, start_fn).call(this);
    return () => {
      __privateGet(this, _subscribers).delete(subscriptionId);
    };
  }
  unsubscribeAll() {
    __privateGet(this, _subscribers).clear();
  }
  /** Unix time at which we last synced. Undefined when `isLoading` is true. */
  lastSyncedAt() {
    return __privateGet(this, _lastSyncedAt);
  }
  /** Time elapsed since last sync (in ms). Infinity if we did not yet sync. */
  lastSynced() {
    if (__privateGet(this, _lastSyncedAt) === void 0) return Infinity;
    return Date.now() - __privateGet(this, _lastSyncedAt);
  }
  /** Indicates if we are connected to the Electric sync service. */
  isConnected() {
    return __privateGet(this, _connected);
  }
  /** True during initial fetch. False afterwise.  */
  isLoading() {
    return !__privateGet(this, _isUpToDate);
  }
  hasStarted() {
    return __privateGet(this, _started);
  }
  isPaused() {
    return __privateGet(this, _state) === `paused`;
  }
  /**
   * Refreshes the shape stream.
   * This preemptively aborts any ongoing long poll and reconnects without
   * long polling, ensuring that the stream receives an up to date message with the
   * latest LSN from Postgres at that point in time.
   */
  forceDisconnectAndRefresh() {
    return __async(this, null, function* () {
      var _a, _b;
      __privateSet(this, _isRefreshing, true);
      if (__privateGet(this, _isUpToDate) && !((_a = __privateGet(this, _requestAbortController)) == null ? void 0 : _a.signal.aborted)) {
        (_b = __privateGet(this, _requestAbortController)) == null ? void 0 : _b.abort(FORCE_DISCONNECT_AND_REFRESH);
      }
      yield __privateMethod(this, _ShapeStream_instances, nextTick_fn).call(this);
      __privateSet(this, _isRefreshing, false);
    });
  }
  /**
   * Request a snapshot for subset of data.
   *
   * Only available when mode is `changes_only`.
   * Returns the insertion point & the data, but more importantly injects the data
   * into the subscribed data stream. Returned value is unlikely to be useful for the caller,
   * unless the caller has complicated additional logic.
   *
   * Data will be injected in a way that's also tracking further incoming changes, and it'll
   * skip the ones that are already in the snapshot.
   *
   * @param opts - The options for the snapshot request.
   * @returns The metadata and the data for the snapshot.
   */
  requestSnapshot(opts) {
    return __async(this, null, function* () {
      if (__privateGet(this, _mode) === `full`) {
        throw new Error(
          `Snapshot requests are not supported in ${__privateGet(this, _mode)} mode, as the consumer is guaranteed to observe all data`
        );
      }
      if (!__privateGet(this, _started)) yield __privateMethod(this, _ShapeStream_instances, start_fn).call(this);
      yield __privateMethod(this, _ShapeStream_instances, waitForStreamEnd_fn).call(this);
      __privateWrapper(this, _activeSnapshotRequests)._++;
      try {
        if (__privateGet(this, _activeSnapshotRequests) === 1) {
          __privateMethod(this, _ShapeStream_instances, pause_fn).call(this);
        }
        const { fetchUrl, requestHeaders } = yield __privateMethod(this, _ShapeStream_instances, constructUrl_fn).call(this, this.options.url, true, opts);
        const { metadata: metadata2, data } = yield __privateMethod(this, _ShapeStream_instances, fetchSnapshot_fn).call(this, fetchUrl, requestHeaders);
        const dataWithEndBoundary = data.concat([
          { headers: __spreadValues({ control: `snapshot-end` }, metadata2) }
        ]);
        __privateGet(this, _snapshotTracker).addSnapshot(
          metadata2,
          new Set(data.map((message) => message.key))
        );
        __privateMethod(this, _ShapeStream_instances, onMessages_fn).call(this, dataWithEndBoundary, false);
        return {
          metadata: metadata2,
          data
        };
      } finally {
        __privateWrapper(this, _activeSnapshotRequests)._--;
        if (__privateGet(this, _activeSnapshotRequests) === 0) {
          __privateMethod(this, _ShapeStream_instances, resume_fn).call(this);
        }
      }
    });
  }
};
_error = /* @__PURE__ */ new WeakMap();
_fetchClient2 = /* @__PURE__ */ new WeakMap();
_sseFetchClient = /* @__PURE__ */ new WeakMap();
_messageParser = /* @__PURE__ */ new WeakMap();
_subscribers = /* @__PURE__ */ new WeakMap();
_started = /* @__PURE__ */ new WeakMap();
_state = /* @__PURE__ */ new WeakMap();
_lastOffset = /* @__PURE__ */ new WeakMap();
_liveCacheBuster = /* @__PURE__ */ new WeakMap();
_lastSyncedAt = /* @__PURE__ */ new WeakMap();
_isUpToDate = /* @__PURE__ */ new WeakMap();
_isMidStream = /* @__PURE__ */ new WeakMap();
_connected = /* @__PURE__ */ new WeakMap();
_shapeHandle = /* @__PURE__ */ new WeakMap();
_mode = /* @__PURE__ */ new WeakMap();
_schema = /* @__PURE__ */ new WeakMap();
_onError = /* @__PURE__ */ new WeakMap();
_requestAbortController = /* @__PURE__ */ new WeakMap();
_isRefreshing = /* @__PURE__ */ new WeakMap();
_tickPromise = /* @__PURE__ */ new WeakMap();
_tickPromiseResolver = /* @__PURE__ */ new WeakMap();
_tickPromiseRejecter = /* @__PURE__ */ new WeakMap();
_messageChain = /* @__PURE__ */ new WeakMap();
_snapshotTracker = /* @__PURE__ */ new WeakMap();
_activeSnapshotRequests = /* @__PURE__ */ new WeakMap();
_midStreamPromise = /* @__PURE__ */ new WeakMap();
_midStreamPromiseResolver = /* @__PURE__ */ new WeakMap();
_ShapeStream_instances = /* @__PURE__ */ new WeakSet();
start_fn = function() {
  return __async(this, null, function* () {
    var _a;
    __privateSet(this, _started, true);
    try {
      yield __privateMethod(this, _ShapeStream_instances, requestShape_fn).call(this);
    } catch (err) {
      __privateSet(this, _error, err);
      if (__privateGet(this, _onError)) {
        const retryOpts = yield __privateGet(this, _onError).call(this, err);
        if (typeof retryOpts === `object`) {
          __privateMethod(this, _ShapeStream_instances, reset_fn).call(this);
          if (`params` in retryOpts) {
            this.options.params = retryOpts.params;
          }
          if (`headers` in retryOpts) {
            this.options.headers = retryOpts.headers;
          }
          __privateSet(this, _started, false);
          __privateMethod(this, _ShapeStream_instances, start_fn).call(this);
        }
        return;
      }
      throw err;
    } finally {
      __privateSet(this, _connected, false);
      (_a = __privateGet(this, _tickPromiseRejecter)) == null ? void 0 : _a.call(this);
    }
  });
};
requestShape_fn = function() {
  return __async(this, null, function* () {
    var _a, _b;
    if (__privateGet(this, _state) === `pause-requested`) {
      __privateSet(this, _state, `paused`);
      return;
    }
    if (!this.options.subscribe && (((_a = this.options.signal) == null ? void 0 : _a.aborted) || __privateGet(this, _isUpToDate))) {
      return;
    }
    const resumingFromPause = __privateGet(this, _state) === `paused`;
    __privateSet(this, _state, `active`);
    const { url, signal } = this.options;
    const { fetchUrl, requestHeaders } = yield __privateMethod(this, _ShapeStream_instances, constructUrl_fn).call(this, url, resumingFromPause);
    const abortListener = yield __privateMethod(this, _ShapeStream_instances, createAbortListener_fn).call(this, signal);
    const requestAbortController = __privateGet(this, _requestAbortController);
    try {
      yield __privateMethod(this, _ShapeStream_instances, fetchShape_fn).call(this, {
        fetchUrl,
        requestAbortController,
        headers: requestHeaders,
        resumingFromPause
      });
    } catch (e) {
      if ((e instanceof FetchError || e instanceof FetchBackoffAbortError) && requestAbortController.signal.aborted && requestAbortController.signal.reason === FORCE_DISCONNECT_AND_REFRESH) {
        return __privateMethod(this, _ShapeStream_instances, requestShape_fn).call(this);
      }
      if (e instanceof FetchBackoffAbortError) {
        if (requestAbortController.signal.aborted && requestAbortController.signal.reason === PAUSE_STREAM) {
          __privateSet(this, _state, `paused`);
        }
        return;
      }
      if (!(e instanceof FetchError)) throw e;
      if (e.status == 409) {
        if (__privateGet(this, _shapeHandle)) {
          const shapeKey = canonicalShapeKey(fetchUrl);
          expiredShapesCache.markExpired(shapeKey, __privateGet(this, _shapeHandle));
        }
        const newShapeHandle = e.headers[SHAPE_HANDLE_HEADER] || `${__privateGet(this, _shapeHandle)}-next`;
        __privateMethod(this, _ShapeStream_instances, reset_fn).call(this, newShapeHandle);
        yield __privateMethod(this, _ShapeStream_instances, publish_fn).call(this, e.json);
        return __privateMethod(this, _ShapeStream_instances, requestShape_fn).call(this);
      } else {
        __privateMethod(this, _ShapeStream_instances, sendErrorToSubscribers_fn).call(this, e);
        throw e;
      }
    } finally {
      if (abortListener && signal) {
        signal.removeEventListener(`abort`, abortListener);
      }
      __privateSet(this, _requestAbortController, void 0);
    }
    (_b = __privateGet(this, _tickPromiseResolver)) == null ? void 0 : _b.call(this);
    return __privateMethod(this, _ShapeStream_instances, requestShape_fn).call(this);
  });
};
constructUrl_fn = function(url, resumingFromPause, subsetParams) {
  return __async(this, null, function* () {
    const [requestHeaders, params] = yield Promise.all([
      resolveHeaders(this.options.headers),
      this.options.params ? toInternalParams(convertWhereParamsToObj(this.options.params)) : void 0
    ]);
    if (params) validateParams(params);
    const fetchUrl = new URL(url);
    if (params) {
      if (params.table) setQueryParam(fetchUrl, TABLE_QUERY_PARAM, params.table);
      if (params.where) setQueryParam(fetchUrl, WHERE_QUERY_PARAM, params.where);
      if (params.columns)
        setQueryParam(fetchUrl, COLUMNS_QUERY_PARAM, params.columns);
      if (params.replica) setQueryParam(fetchUrl, REPLICA_PARAM, params.replica);
      if (params.params)
        setQueryParam(fetchUrl, WHERE_PARAMS_PARAM, params.params);
      const customParams = __spreadValues({}, params);
      delete customParams.table;
      delete customParams.where;
      delete customParams.columns;
      delete customParams.replica;
      delete customParams.params;
      for (const [key, value] of Object.entries(customParams)) {
        setQueryParam(fetchUrl, key, value);
      }
    }
    if (subsetParams) {
      if (subsetParams.where)
        setQueryParam(fetchUrl, SUBSET_PARAM_WHERE, subsetParams.where);
      if (subsetParams.params)
        setQueryParam(fetchUrl, SUBSET_PARAM_WHERE_PARAMS, subsetParams.params);
      if (subsetParams.limit)
        setQueryParam(fetchUrl, SUBSET_PARAM_LIMIT, subsetParams.limit);
      if (subsetParams.offset)
        setQueryParam(fetchUrl, SUBSET_PARAM_OFFSET, subsetParams.offset);
      if (subsetParams.orderBy)
        setQueryParam(fetchUrl, SUBSET_PARAM_ORDER_BY, subsetParams.orderBy);
    }
    fetchUrl.searchParams.set(OFFSET_QUERY_PARAM, __privateGet(this, _lastOffset));
    fetchUrl.searchParams.set(LOG_MODE_QUERY_PARAM, __privateGet(this, _mode));
    if (__privateGet(this, _isUpToDate)) {
      if (!__privateGet(this, _isRefreshing) && !resumingFromPause) {
        fetchUrl.searchParams.set(LIVE_QUERY_PARAM, `true`);
      }
      fetchUrl.searchParams.set(
        LIVE_CACHE_BUSTER_QUERY_PARAM,
        __privateGet(this, _liveCacheBuster)
      );
    }
    if (__privateGet(this, _shapeHandle)) {
      fetchUrl.searchParams.set(SHAPE_HANDLE_QUERY_PARAM, __privateGet(this, _shapeHandle));
    }
    const shapeKey = canonicalShapeKey(fetchUrl);
    const expiredHandle = expiredShapesCache.getExpiredHandle(shapeKey);
    if (expiredHandle) {
      fetchUrl.searchParams.set(EXPIRED_HANDLE_QUERY_PARAM, expiredHandle);
    }
    fetchUrl.searchParams.sort();
    return {
      fetchUrl,
      requestHeaders
    };
  });
};
createAbortListener_fn = function(signal) {
  return __async(this, null, function* () {
    var _a;
    __privateSet(this, _requestAbortController, new AbortController());
    if (signal) {
      const abortListener = () => {
        var _a2;
        (_a2 = __privateGet(this, _requestAbortController)) == null ? void 0 : _a2.abort(signal.reason);
      };
      signal.addEventListener(`abort`, abortListener, { once: true });
      if (signal.aborted) {
        (_a = __privateGet(this, _requestAbortController)) == null ? void 0 : _a.abort(signal.reason);
      }
      return abortListener;
    }
  });
};
onInitialResponse_fn = function(response) {
  return __async(this, null, function* () {
    var _a;
    const { headers, status } = response;
    const shapeHandle = headers.get(SHAPE_HANDLE_HEADER);
    if (shapeHandle) {
      __privateSet(this, _shapeHandle, shapeHandle);
    }
    const lastOffset = headers.get(CHUNK_LAST_OFFSET_HEADER);
    if (lastOffset) {
      __privateSet(this, _lastOffset, lastOffset);
    }
    const liveCacheBuster = headers.get(LIVE_CACHE_BUSTER_HEADER);
    if (liveCacheBuster) {
      __privateSet(this, _liveCacheBuster, liveCacheBuster);
    }
    const getSchema = () => {
      const schemaHeader = headers.get(SHAPE_SCHEMA_HEADER);
      return schemaHeader ? JSON.parse(schemaHeader) : {};
    };
    __privateSet(this, _schema, (_a = __privateGet(this, _schema)) != null ? _a : getSchema());
    if (status === 204) {
      __privateSet(this, _lastSyncedAt, Date.now());
    }
  });
};
onMessages_fn = function(batch, isSseMessage = false) {
  return __async(this, null, function* () {
    var _a;
    if (batch.length > 0) {
      __privateSet(this, _isMidStream, true);
      const lastMessage = batch[batch.length - 1];
      if (isUpToDateMessage(lastMessage)) {
        if (isSseMessage) {
          const offset = getOffset(lastMessage);
          if (offset) {
            __privateSet(this, _lastOffset, offset);
          }
        }
        __privateSet(this, _lastSyncedAt, Date.now());
        __privateSet(this, _isUpToDate, true);
        __privateSet(this, _isMidStream, false);
        (_a = __privateGet(this, _midStreamPromiseResolver)) == null ? void 0 : _a.call(this);
      }
      const messagesToProcess = batch.filter((message) => {
        if (isChangeMessage(message)) {
          return !__privateGet(this, _snapshotTracker).shouldRejectMessage(message);
        }
        return true;
      });
      yield __privateMethod(this, _ShapeStream_instances, publish_fn).call(this, messagesToProcess);
    }
  });
};
fetchShape_fn = function(opts) {
  return __async(this, null, function* () {
    if (__privateGet(this, _isUpToDate) && this.options.experimentalLiveSse && !__privateGet(this, _isRefreshing) && !opts.resumingFromPause) {
      opts.fetchUrl.searchParams.set(EXPERIMENTAL_LIVE_SSE_QUERY_PARAM, `true`);
      return __privateMethod(this, _ShapeStream_instances, requestShapeSSE_fn).call(this, opts);
    }
    return __privateMethod(this, _ShapeStream_instances, requestShapeLongPoll_fn).call(this, opts);
  });
};
requestShapeLongPoll_fn = function(opts) {
  return __async(this, null, function* () {
    const { fetchUrl, requestAbortController, headers } = opts;
    const response = yield __privateGet(this, _fetchClient2).call(this, fetchUrl.toString(), {
      signal: requestAbortController.signal,
      headers
    });
    __privateSet(this, _connected, true);
    yield __privateMethod(this, _ShapeStream_instances, onInitialResponse_fn).call(this, response);
    const schema = __privateGet(this, _schema);
    const res = yield response.text();
    const messages = res || `[]`;
    const batch = __privateGet(this, _messageParser).parse(messages, schema);
    yield __privateMethod(this, _ShapeStream_instances, onMessages_fn).call(this, batch);
  });
};
requestShapeSSE_fn = function(opts) {
  return __async(this, null, function* () {
    const { fetchUrl, requestAbortController, headers } = opts;
    const fetch2 = __privateGet(this, _sseFetchClient);
    try {
      let buffer = [];
      yield fetchEventSource(fetchUrl.toString(), {
        headers,
        fetch: fetch2,
        onopen: (response) => __async(this, null, function* () {
          __privateSet(this, _connected, true);
          yield __privateMethod(this, _ShapeStream_instances, onInitialResponse_fn).call(this, response);
        }),
        onmessage: (event) => {
          if (event.data) {
            const schema = __privateGet(this, _schema);
            const message = __privateGet(this, _messageParser).parse(
              event.data,
              schema
            );
            buffer.push(message);
            if (isUpToDateMessage(message)) {
              __privateMethod(this, _ShapeStream_instances, onMessages_fn).call(this, buffer, true);
              buffer = [];
            }
          }
        },
        onerror: (error) => {
          throw error;
        },
        signal: requestAbortController.signal
      });
    } catch (error) {
      if (requestAbortController.signal.aborted) {
        throw new FetchBackoffAbortError();
      }
      throw error;
    }
  });
};
pause_fn = function() {
  var _a;
  if (__privateGet(this, _started) && __privateGet(this, _state) === `active`) {
    __privateSet(this, _state, `pause-requested`);
    (_a = __privateGet(this, _requestAbortController)) == null ? void 0 : _a.abort(PAUSE_STREAM);
  }
};
resume_fn = function() {
  if (__privateGet(this, _started) && __privateGet(this, _state) === `paused`) {
    __privateMethod(this, _ShapeStream_instances, start_fn).call(this);
  }
};
nextTick_fn = function() {
  return __async(this, null, function* () {
    if (__privateGet(this, _tickPromise)) {
      return __privateGet(this, _tickPromise);
    }
    __privateSet(this, _tickPromise, new Promise((resolve, reject) => {
      __privateSet(this, _tickPromiseResolver, resolve);
      __privateSet(this, _tickPromiseRejecter, reject);
    }));
    __privateGet(this, _tickPromise).finally(() => {
      __privateSet(this, _tickPromise, void 0);
      __privateSet(this, _tickPromiseResolver, void 0);
      __privateSet(this, _tickPromiseRejecter, void 0);
    });
    return __privateGet(this, _tickPromise);
  });
};
waitForStreamEnd_fn = function() {
  return __async(this, null, function* () {
    if (!__privateGet(this, _isMidStream)) {
      return;
    }
    if (__privateGet(this, _midStreamPromise)) {
      return __privateGet(this, _midStreamPromise);
    }
    __privateSet(this, _midStreamPromise, new Promise((resolve) => {
      __privateSet(this, _midStreamPromiseResolver, resolve);
    }));
    __privateGet(this, _midStreamPromise).finally(() => {
      __privateSet(this, _midStreamPromise, void 0);
      __privateSet(this, _midStreamPromiseResolver, void 0);
    });
    return __privateGet(this, _midStreamPromise);
  });
};
publish_fn = function(messages) {
  return __async(this, null, function* () {
    __privateSet(this, _messageChain, __privateGet(this, _messageChain).then(
      () => Promise.all(
        Array.from(__privateGet(this, _subscribers).values()).map((_0) => __async(this, [_0], function* ([callback, __]) {
          try {
            yield callback(messages);
          } catch (err) {
            queueMicrotask(() => {
              throw err;
            });
          }
        }))
      )
    ));
    return __privateGet(this, _messageChain);
  });
};
sendErrorToSubscribers_fn = function(error) {
  __privateGet(this, _subscribers).forEach(([_2, errorFn]) => {
    errorFn == null ? void 0 : errorFn(error);
  });
};
subscribeToVisibilityChanges_fn = function() {
  if (typeof document === `object` && typeof document.hidden === `boolean` && typeof document.addEventListener === `function`) {
    const visibilityHandler = () => {
      if (document.hidden) {
        __privateMethod(this, _ShapeStream_instances, pause_fn).call(this);
      } else {
        __privateMethod(this, _ShapeStream_instances, resume_fn).call(this);
      }
    };
    document.addEventListener(`visibilitychange`, visibilityHandler);
  }
};
reset_fn = function(handle) {
  __privateSet(this, _lastOffset, `-1`);
  __privateSet(this, _liveCacheBuster, ``);
  __privateSet(this, _shapeHandle, handle);
  __privateSet(this, _isUpToDate, false);
  __privateSet(this, _isMidStream, true);
  __privateSet(this, _connected, false);
  __privateSet(this, _schema, void 0);
  __privateSet(this, _activeSnapshotRequests, 0);
};
fetchSnapshot_fn = function(url, headers) {
  return __async(this, null, function* () {
    const response = yield __privateGet(this, _fetchClient2).call(this, url.toString(), { headers });
    if (!response.ok) {
      throw new FetchError(
        response.status,
        void 0,
        void 0,
        Object.fromEntries([...response.headers.entries()]),
        url.toString()
      );
    }
    const { metadata: metadata2, data } = yield response.json();
    const batch = __privateGet(this, _messageParser).parse(
      JSON.stringify(data),
      __privateGet(this, _schema)
    );
    return {
      metadata: metadata2,
      data: batch
    };
  });
};
ShapeStream.Replica = {
  FULL: `full`,
  DEFAULT: `default`
};
function validateParams(params) {
  if (!params) return;
  const reservedParams = Object.keys(params).filter(
    (key) => RESERVED_PARAMS.has(key)
  );
  if (reservedParams.length > 0) {
    throw new ReservedParamError(reservedParams);
  }
}
function validateOptions(options) {
  if (!options.url) {
    throw new MissingShapeUrlError();
  }
  if (options.signal && !(options.signal instanceof AbortSignal)) {
    throw new InvalidSignalError();
  }
  if (options.offset !== void 0 && options.offset !== `-1` && options.offset !== `now` && !options.handle) {
    throw new MissingShapeHandleError();
  }
  validateParams(options.params);
  return;
}
function setQueryParam(url, key, value) {
  if (value === void 0 || value == null) {
    return;
  } else if (typeof value === `string`) {
    url.searchParams.set(key, value);
  } else if (typeof value === `object`) {
    for (const [k, v2] of Object.entries(value)) {
      url.searchParams.set(`${key}[${k}]`, v2);
    }
  } else {
    url.searchParams.set(key, value.toString());
  }
}
function convertWhereParamsToObj(allPgParams) {
  if (Array.isArray(allPgParams.params)) {
    return __spreadProps(__spreadValues({}, allPgParams), {
      params: Object.fromEntries(allPgParams.params.map((v2, i2) => [i2 + 1, v2]))
    });
  }
  return allPgParams;
}
var _data;
var _subscribers2;
var _insertedKeys;
var _requestedSubSnapshots;
var _reexecuteSnapshotsPending;
var _status;
var _error2;
var _Shape_instances;
var process_fn;
var reexecuteSnapshots_fn;
var awaitUpToDate_fn;
var updateShapeStatus_fn;
var handleError_fn;
var notify_fn;
_data = /* @__PURE__ */ new WeakMap();
_subscribers2 = /* @__PURE__ */ new WeakMap();
_insertedKeys = /* @__PURE__ */ new WeakMap();
_requestedSubSnapshots = /* @__PURE__ */ new WeakMap();
_reexecuteSnapshotsPending = /* @__PURE__ */ new WeakMap();
_status = /* @__PURE__ */ new WeakMap();
_error2 = /* @__PURE__ */ new WeakMap();
_Shape_instances = /* @__PURE__ */ new WeakSet();
process_fn = function(messages) {
  let shouldNotify = false;
  messages.forEach((message) => {
    if (isChangeMessage(message)) {
      shouldNotify = __privateMethod(this, _Shape_instances, updateShapeStatus_fn).call(this, `syncing`);
      if (this.mode === `full`) {
        switch (message.headers.operation) {
          case `insert`:
            __privateGet(this, _data).set(message.key, message.value);
            break;
          case `update`:
            __privateGet(this, _data).set(message.key, __spreadValues(__spreadValues({}, __privateGet(this, _data).get(message.key)), message.value));
            break;
          case `delete`:
            __privateGet(this, _data).delete(message.key);
            break;
        }
      } else {
        switch (message.headers.operation) {
          case `insert`:
            __privateGet(this, _insertedKeys).add(message.key);
            __privateGet(this, _data).set(message.key, message.value);
            break;
          case `update`:
            if (__privateGet(this, _insertedKeys).has(message.key)) {
              __privateGet(this, _data).set(message.key, __spreadValues(__spreadValues({}, __privateGet(this, _data).get(message.key)), message.value));
            }
            break;
          case `delete`:
            if (__privateGet(this, _insertedKeys).has(message.key)) {
              __privateGet(this, _data).delete(message.key);
              __privateGet(this, _insertedKeys).delete(message.key);
            }
            break;
        }
      }
    }
    if (isControlMessage(message)) {
      switch (message.headers.control) {
        case `up-to-date`:
          shouldNotify = __privateMethod(this, _Shape_instances, updateShapeStatus_fn).call(this, `up-to-date`);
          if (__privateGet(this, _reexecuteSnapshotsPending)) {
            __privateSet(this, _reexecuteSnapshotsPending, false);
            void __privateMethod(this, _Shape_instances, reexecuteSnapshots_fn).call(this);
          }
          break;
        case `must-refetch`:
          __privateGet(this, _data).clear();
          __privateGet(this, _insertedKeys).clear();
          __privateSet(this, _error2, false);
          shouldNotify = __privateMethod(this, _Shape_instances, updateShapeStatus_fn).call(this, `syncing`);
          __privateSet(this, _reexecuteSnapshotsPending, true);
          break;
      }
    }
  });
  if (shouldNotify) __privateMethod(this, _Shape_instances, notify_fn).call(this);
};
reexecuteSnapshots_fn = function() {
  return __async(this, null, function* () {
    yield __privateMethod(this, _Shape_instances, awaitUpToDate_fn).call(this);
    yield Promise.all(
      Array.from(__privateGet(this, _requestedSubSnapshots)).map((jsonParams) => __async(this, null, function* () {
        try {
          const snapshot = JSON.parse(jsonParams);
          yield this.stream.requestSnapshot(snapshot);
        } catch (_2) {
        }
      }))
    );
  });
};
awaitUpToDate_fn = function() {
  return __async(this, null, function* () {
    if (this.stream.isUpToDate) return;
    yield new Promise((resolve) => {
      const check = () => {
        if (this.stream.isUpToDate) {
          clearInterval(interval);
          unsub();
          resolve();
        }
      };
      const interval = setInterval(check, 10);
      const unsub = this.stream.subscribe(
        () => check(),
        () => check()
      );
      check();
    });
  });
};
updateShapeStatus_fn = function(status) {
  const stateChanged = __privateGet(this, _status) !== status;
  __privateSet(this, _status, status);
  return stateChanged && status === `up-to-date`;
};
handleError_fn = function(e) {
  if (e instanceof FetchError) {
    __privateSet(this, _error2, e);
    __privateMethod(this, _Shape_instances, notify_fn).call(this);
  }
};
notify_fn = function() {
  __privateGet(this, _subscribers2).forEach((callback) => {
    callback({ value: this.currentValue, rows: this.currentRows });
  });
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/apiClient/version.js
var API_VERSION = "2025-07-16";
var API_VERSION_HEADER_NAME = "x-trigger-api-version";

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/apiClient/stream.js
function zodShapeStream(schema, url, options) {
  const abortController = new AbortController();
  options?.signal?.addEventListener("abort", () => {
    abortController.abort();
  }, { once: true });
  const shapeStream = new ShapeStream({
    url,
    headers: {
      ...options?.headers,
      "x-trigger-electric-version": "1.0.0-beta.1",
      [API_VERSION_HEADER_NAME]: API_VERSION
    },
    fetchClient: options?.fetchClient,
    signal: abortController.signal,
    onError: (e) => {
      options?.onError?.(e);
    }
  });
  const readableShape = new ReadableShapeStream(shapeStream);
  const stream2 = readableShape.stream.pipeThrough(new TransformStream({
    async transform(chunk, controller) {
      const result = schema.safeParse(chunk);
      if (result.success) {
        controller.enqueue(result.data);
      } else {
        controller.error(new Error(`Unable to parse shape: ${result.error.message}`));
      }
    }
  }));
  return {
    stream: stream2,
    stop: (delay) => {
      if (delay) {
        setTimeout(() => {
          if (abortController.signal.aborted)
            return;
          abortController.abort();
        }, delay);
      } else {
        abortController.abort();
      }
    }
  };
}
var ReadableShapeStream = class {
  #stream;
  #currentState = /* @__PURE__ */ new Map();
  #changeStream;
  #error = false;
  #unsubscribe;
  #isStreamClosed = false;
  stop() {
    this.#isStreamClosed = true;
    this.#unsubscribe?.();
  }
  constructor(stream2) {
    this.#stream = stream2;
    const source = new ReadableStream({
      start: (controller) => {
        this.#unsubscribe = this.#stream.subscribe((messages) => {
          if (!this.#isStreamClosed) {
            controller.enqueue(messages);
          }
        }, this.#handleError.bind(this));
      },
      cancel: () => {
        this.#isStreamClosed = true;
        this.#unsubscribe?.();
      }
    });
    let updatedKeys = /* @__PURE__ */ new Set();
    this.#changeStream = createAsyncIterableStream(source, {
      transform: (messages, controller) => {
        if (this.#isStreamClosed) {
          return;
        }
        try {
          let isUpToDate = false;
          for (const message of messages) {
            if (isChangeMessage(message)) {
              const key = message.key;
              switch (message.headers.operation) {
                case "insert": {
                  this.#currentState.set(key, message.value);
                  updatedKeys.add(key);
                  break;
                }
                case "update": {
                  const existingRow = this.#currentState.get(key);
                  const updatedRow = existingRow ? { ...existingRow, ...message.value } : message.value;
                  this.#currentState.set(key, updatedRow);
                  updatedKeys.add(key);
                  break;
                }
              }
            } else if (isControlMessage(message)) {
              if (message.headers.control === "must-refetch") {
                this.#currentState.clear();
                this.#error = false;
              } else if (message.headers.control === "up-to-date") {
                isUpToDate = true;
              }
            }
          }
          if (!this.#isStreamClosed && isUpToDate) {
            for (const key of updatedKeys) {
              const finalRow = this.#currentState.get(key);
              if (finalRow) {
                controller.enqueue(finalRow);
              }
            }
            updatedKeys.clear();
          }
        } catch (error) {
          console.error("Error processing stream messages:", error);
          this.#handleError(error);
        }
      }
    });
  }
  get stream() {
    return this.#changeStream;
  }
  get isUpToDate() {
    return this.#stream.isUpToDate;
  }
  get lastOffset() {
    return this.#stream.lastOffset;
  }
  get handle() {
    return this.#stream.shapeHandle;
  }
  get error() {
    return this.#error;
  }
  lastSyncedAt() {
    return this.#stream.lastSyncedAt();
  }
  lastSynced() {
    return this.#stream.lastSynced();
  }
  isLoading() {
    return this.#stream.isLoading();
  }
  isConnected() {
    return this.#stream.isConnected();
  }
  #handleError(e) {
    if (e instanceof FetchError) {
      this.#error = e;
    }
    this.#isStreamClosed = true;
    this.#unsubscribe?.();
  }
};
var LineTransformStream = class extends TransformStream {
  buffer = "";
  constructor() {
    super({
      transform: (chunk, controller) => {
        this.buffer += chunk;
        const lines = this.buffer.split("\n");
        this.buffer = lines.pop() || "";
        const fullLines = lines.filter((line) => line.trim().length > 0);
        if (fullLines.length > 0) {
          controller.enqueue(fullLines);
        }
      },
      flush: (controller) => {
        const trimmed = this.buffer.trim();
        if (trimmed.length > 0) {
          controller.enqueue([trimmed]);
        }
      }
    });
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/apiClient/runStream.js
function runShapeStream(url, options) {
  const abortController = new AbortController();
  const streamFactory = new SSEStreamSubscriptionFactory(getEnvVar("TRIGGER_STREAM_URL", getEnvVar("TRIGGER_API_URL")) ?? "https://api.trigger.dev", {
    headers: options?.headers,
    signal: abortController.signal
  });
  options?.signal?.addEventListener("abort", () => {
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
  }, { once: true });
  const runStreamInstance = zodShapeStream(SubscribeRunRawShape, url, {
    ...options,
    signal: abortController.signal,
    onError: (e) => {
      options?.onFetchError?.(e);
    }
  });
  const $options = {
    runShapeStream: runStreamInstance.stream,
    stopRunShapeStream: () => runStreamInstance.stop(30 * 1e3),
    streamFactory,
    abortController,
    ...options
  };
  return new RunSubscription($options);
}
var SSEStreamSubscription = class {
  url;
  options;
  lastEventId;
  retryCount = 0;
  maxRetries = 5;
  retryDelayMs = 1e3;
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.lastEventId = options.lastEventId;
  }
  async subscribe() {
    const self = this;
    return new ReadableStream({
      async start(controller) {
        await self.connectStream(controller);
      },
      cancel(reason) {
        self.options.onComplete?.();
      }
    });
  }
  async connectStream(controller) {
    try {
      const headers = {
        Accept: "text/event-stream",
        ...this.options.headers
      };
      if (this.lastEventId) {
        headers["Last-Event-ID"] = this.lastEventId;
      }
      if (this.options.timeoutInSeconds) {
        headers["Timeout-Seconds"] = this.options.timeoutInSeconds.toString();
      }
      const response = await fetch(this.url, {
        headers,
        signal: this.options.signal
      });
      if (!response.ok) {
        const error = ApiError.generate(response.status, {}, "Could not subscribe to stream", Object.fromEntries(response.headers));
        this.options.onError?.(error);
        throw error;
      }
      if (!response.body) {
        const error = new Error("No response body");
        this.options.onError?.(error);
        throw error;
      }
      const streamVersion = response.headers.get("X-Stream-Version") ?? "v1";
      this.retryCount = 0;
      const seenIds = /* @__PURE__ */ new Set();
      const stream2 = response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream()).pipeThrough(new TransformStream({
        transform: (chunk, chunkController) => {
          if (streamVersion === "v1") {
            if (chunk.id) {
              this.lastEventId = chunk.id;
            }
            const timestamp = parseRedisStreamIdTimestamp(chunk.id);
            chunkController.enqueue({
              id: chunk.id ?? "unknown",
              chunk: safeParseJSON(chunk.data),
              timestamp
            });
          } else {
            if (chunk.event === "batch") {
              const data = safeParseJSON(chunk.data);
              for (const record of data.records) {
                this.lastEventId = record.seq_num.toString();
                const parsedBody = safeParseJSON(record.body);
                if (seenIds.has(parsedBody.id)) {
                  continue;
                }
                seenIds.add(parsedBody.id);
                chunkController.enqueue({
                  id: record.seq_num.toString(),
                  chunk: parsedBody.data,
                  timestamp: record.timestamp
                });
              }
            }
          }
        }
      }));
      const reader = stream2.getReader();
      try {
        let chunkCount = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            reader.releaseLock();
            controller.close();
            this.options.onComplete?.();
            return;
          }
          if (this.options.signal?.aborted) {
            reader.cancel();
            reader.releaseLock();
            controller.close();
            this.options.onComplete?.();
            return;
          }
          chunkCount++;
          controller.enqueue(value);
        }
      } catch (error) {
        reader.releaseLock();
        throw error;
      }
    } catch (error) {
      if (this.options.signal?.aborted) {
        controller.close();
        this.options.onComplete?.();
        return;
      }
      await this.retryConnection(controller, error);
    }
  }
  async retryConnection(controller, error) {
    if (this.options.signal?.aborted) {
      controller.close();
      this.options.onComplete?.();
      return;
    }
    if (this.retryCount >= this.maxRetries) {
      const finalError = error || new Error("Max retries reached");
      controller.error(finalError);
      this.options.onError?.(finalError);
      return;
    }
    this.retryCount++;
    const delay = this.retryDelayMs * Math.pow(2, this.retryCount - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));
    if (this.options.signal?.aborted) {
      controller.close();
      this.options.onComplete?.();
      return;
    }
    await this.connectStream(controller);
  }
};
var SSEStreamSubscriptionFactory = class {
  baseUrl;
  options;
  constructor(baseUrl, options) {
    this.baseUrl = baseUrl;
    this.options = options;
  }
  createSubscription(runId, streamKey, options) {
    if (!runId || !streamKey) {
      throw new Error("runId and streamKey are required");
    }
    const url = `${options?.baseUrl ?? this.baseUrl}/realtime/v1/streams/${runId}/${streamKey}`;
    return new SSEStreamSubscription(url, {
      ...this.options,
      ...options
    });
  }
};
var RunSubscription = class {
  options;
  stream;
  packetCache = /* @__PURE__ */ new Map();
  _closeOnComplete;
  _isRunComplete = false;
  constructor(options) {
    this.options = options;
    this._closeOnComplete = typeof options.closeOnComplete === "undefined" ? true : options.closeOnComplete;
    this.stream = createAsyncIterableReadable(this.options.runShapeStream, {
      transform: async (chunk, controller) => {
        const run = await this.transformRunShape(chunk);
        controller.enqueue(run);
        this._isRunComplete = !!run.finishedAt;
        if (this._closeOnComplete && this._isRunComplete && !this.options.abortController.signal.aborted) {
          this.options.stopRunShapeStream();
        }
      }
    }, this.options.abortController.signal);
  }
  unsubscribe() {
    if (!this.options.abortController.signal.aborted) {
      this.options.abortController.abort();
    }
    this.options.stopRunShapeStream();
  }
  [Symbol.asyncIterator]() {
    return this.stream[Symbol.asyncIterator]();
  }
  getReader() {
    return this.stream.getReader();
  }
  withStreams() {
    const activeStreams = /* @__PURE__ */ new Set();
    return createAsyncIterableReadable(this.stream, {
      transform: async (run, controller) => {
        controller.enqueue({
          type: "run",
          run
        });
        const streams2 = getStreamsFromRunShape(run);
        if (streams2.length > 0) {
          for (const streamKey of streams2) {
            if (typeof streamKey !== "string") {
              continue;
            }
            if (!activeStreams.has(streamKey)) {
              activeStreams.add(streamKey);
              const subscription = this.options.streamFactory.createSubscription(run.id, streamKey, {
                baseUrl: this.options.client?.baseUrl
              });
              subscription.subscribe().then((stream2) => {
                stream2.pipeThrough(new TransformStream({
                  transform(chunk, controller2) {
                    controller2.enqueue({
                      type: streamKey,
                      chunk: chunk.chunk,
                      run
                    });
                  }
                })).pipeTo(new WritableStream({
                  write(chunk) {
                    controller.enqueue(chunk);
                  }
                }));
              });
            }
          }
        }
      }
    }, this.options.abortController.signal);
  }
  async transformRunShape(row) {
    const payloadPacket = row.payloadType ? { data: row.payload ?? void 0, dataType: row.payloadType } : void 0;
    const outputPacket = row.outputType ? { data: row.output ?? void 0, dataType: row.outputType } : void 0;
    const [payload, output] = await Promise.all([
      { packet: payloadPacket, key: "payload" },
      { packet: outputPacket, key: "output" }
    ].map(async ({ packet, key }) => {
      if (!packet) {
        return;
      }
      const cachedResult = this.packetCache.get(`${row.friendlyId}/${key}`);
      if (typeof cachedResult !== "undefined") {
        return cachedResult;
      }
      const result = await conditionallyImportAndParsePacket(packet, this.options.client);
      this.packetCache.set(`${row.friendlyId}/${key}`, result);
      return result;
    }));
    const metadata2 = row.metadata && row.metadataType ? await parsePacket({ data: row.metadata, dataType: row.metadataType }) : void 0;
    const status = apiStatusFromRunStatus(row.status);
    return {
      id: row.friendlyId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      taskIdentifier: row.taskIdentifier,
      status,
      payload,
      output,
      durationMs: row.usageDurationMs ?? 0,
      costInCents: row.costInCents ?? 0,
      baseCostInCents: row.baseCostInCents ?? 0,
      tags: row.runTags ?? [],
      idempotencyKey: row.idempotencyKey ?? void 0,
      expiredAt: row.expiredAt ?? void 0,
      finishedAt: row.completedAt ?? void 0,
      startedAt: row.startedAt ?? void 0,
      delayedUntil: row.delayUntil ?? void 0,
      queuedAt: row.queuedAt ?? void 0,
      error: row.error ? createJsonErrorObject(row.error) : void 0,
      isTest: row.isTest ?? false,
      metadata: metadata2,
      realtimeStreams: row.realtimeStreams ?? [],
      ...booleanHelpersFromRunStatus(status)
    };
  }
};
var queuedStatuses = ["PENDING_VERSION", "QUEUED", "PENDING", "DELAYED"];
var waitingStatuses = ["WAITING"];
var executingStatuses = ["DEQUEUED", "EXECUTING"];
var failedStatuses = ["FAILED", "CRASHED", "SYSTEM_FAILURE", "EXPIRED", "TIMED_OUT"];
var successfulStatuses = ["COMPLETED"];
function booleanHelpersFromRunStatus(status) {
  return {
    isQueued: queuedStatuses.includes(status),
    isWaiting: waitingStatuses.includes(status),
    isExecuting: executingStatuses.includes(status),
    isCompleted: successfulStatuses.includes(status) || failedStatuses.includes(status),
    isFailed: failedStatuses.includes(status),
    isSuccess: successfulStatuses.includes(status),
    isCancelled: status === "CANCELED"
  };
}
function apiStatusFromRunStatus(status) {
  switch (status) {
    case "DELAYED": {
      return "DELAYED";
    }
    case "WAITING_FOR_DEPLOY":
    case "PENDING_VERSION": {
      return "PENDING_VERSION";
    }
    case "PENDING": {
      return "QUEUED";
    }
    case "PAUSED":
    case "WAITING_TO_RESUME": {
      return "WAITING";
    }
    case "DEQUEUED": {
      return "DEQUEUED";
    }
    case "RETRYING_AFTER_FAILURE":
    case "EXECUTING": {
      return "EXECUTING";
    }
    case "CANCELED": {
      return "CANCELED";
    }
    case "COMPLETED_SUCCESSFULLY": {
      return "COMPLETED";
    }
    case "SYSTEM_FAILURE": {
      return "SYSTEM_FAILURE";
    }
    case "CRASHED": {
      return "CRASHED";
    }
    case "INTERRUPTED":
    case "COMPLETED_WITH_ERRORS": {
      return "FAILED";
    }
    case "EXPIRED": {
      return "EXPIRED";
    }
    case "TIMED_OUT": {
      return "TIMED_OUT";
    }
    default: {
      return "QUEUED";
    }
  }
}
function safeParseJSON(data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    return data;
  }
}
var isSafari = () => {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && typeof navigator.userAgent === "string") {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
  return false;
};
if (isSafari()) {
  ReadableStream.prototype.values ??= function({ preventCancel = false } = {}) {
    const reader = this.getReader();
    return {
      async next() {
        try {
          const result = await reader.read();
          if (result.done) {
            reader.releaseLock();
          }
          return {
            done: result.done,
            value: result.value
          };
        } catch (e) {
          reader.releaseLock();
          throw e;
        }
      },
      async return(value) {
        if (!preventCancel) {
          const cancelPromise = reader.cancel(value);
          reader.releaseLock();
          await cancelPromise;
        } else {
          reader.releaseLock();
        }
        return { done: true, value };
      },
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  };
  ReadableStream.prototype[Symbol.asyncIterator] ??= ReadableStream.prototype.values;
}
function getStreamsFromRunShape(run) {
  const metadataStreams = run.metadata && "$$streams" in run.metadata && Array.isArray(run.metadata.$$streams) && run.metadata.$$streams.length > 0 && run.metadata.$$streams.every((stream2) => typeof stream2 === "string") ? run.metadata.$$streams : void 0;
  if (metadataStreams) {
    return metadataStreams;
  }
  return run.realtimeStreams;
}
function parseRedisStreamIdTimestamp(id) {
  if (!id) {
    return Date.now();
  }
  const timestamp = parseInt(id.split("-")[0], 10);
  if (isNaN(timestamp)) {
    return Date.now();
  }
  return timestamp;
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/apiClient/index.js
var DEFAULT_ZOD_FETCH_OPTIONS = {
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 1e3,
    maxTimeoutInMs: 3e4,
    factor: 1.6,
    randomize: false
  }
};
var ApiClient = class {
  baseUrl;
  accessToken;
  previewBranch;
  futureFlags;
  defaultRequestOptions;
  constructor(baseUrl, accessToken, previewBranch, requestOptions = {}, futureFlags = {}) {
    this.accessToken = accessToken;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.previewBranch = previewBranch;
    this.defaultRequestOptions = mergeRequestOptions(DEFAULT_ZOD_FETCH_OPTIONS, requestOptions);
    this.futureFlags = futureFlags;
  }
  get fetchClient() {
    const headers = this.#getHeaders(false);
    const fetchClient = (input, requestInit) => {
      const $requestInit = {
        ...requestInit,
        headers: {
          ...requestInit?.headers,
          ...headers
        }
      };
      return fetch(input, $requestInit);
    };
    return fetchClient;
  }
  getHeaders() {
    return this.#getHeaders(false);
  }
  async getRunResult(runId, requestOptions) {
    try {
      return await zodfetch(TaskRunExecutionResult, `${this.baseUrl}/api/v1/runs/${runId}/result`, {
        method: "GET",
        headers: this.#getHeaders(false)
      }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          return void 0;
        }
      }
      throw error;
    }
  }
  async getBatchResults(batchId, requestOptions) {
    return await zodfetch(BatchTaskRunExecutionResult, `${this.baseUrl}/api/v1/batches/${batchId}/results`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  triggerTask(taskId, body, clientOptions, requestOptions) {
    const encodedTaskId = encodeURIComponent(taskId);
    return zodfetch(TriggerTaskResponse, `${this.baseUrl}/api/v1/tasks/${encodedTaskId}/trigger`, {
      method: "POST",
      headers: this.#getHeaders(clientOptions?.spanParentAsLink ?? false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions)).withResponse().then(async ({ data, response }) => {
      const jwtHeader = response.headers.get("x-trigger-jwt");
      if (typeof jwtHeader === "string") {
        return {
          ...data,
          publicAccessToken: jwtHeader
        };
      }
      const claimsHeader = response.headers.get("x-trigger-jwt-claims");
      const claims = claimsHeader ? JSON.parse(claimsHeader) : void 0;
      const jwt = await generateJWT({
        secretKey: this.accessToken,
        payload: {
          ...claims,
          scopes: [`read:runs:${data.id}`]
        },
        expirationTime: requestOptions?.publicAccessToken?.expirationTime ?? "1h"
      });
      return {
        ...data,
        publicAccessToken: jwt
      };
    });
  }
  batchTriggerV3(body, clientOptions, requestOptions) {
    return zodfetch(BatchTriggerTaskV3Response, `${this.baseUrl}/api/v2/tasks/batch`, {
      method: "POST",
      headers: this.#getHeaders(clientOptions?.spanParentAsLink ?? false, {
        "batch-processing-strategy": clientOptions?.processingStrategy
      }),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions)).withResponse().then(async ({ data, response }) => {
      const claimsHeader = response.headers.get("x-trigger-jwt-claims");
      const claims = claimsHeader ? JSON.parse(claimsHeader) : void 0;
      const jwt = await generateJWT({
        secretKey: this.accessToken,
        payload: {
          ...claims,
          scopes: [`read:batch:${data.id}`]
        },
        expirationTime: requestOptions?.publicAccessToken?.expirationTime ?? "1h"
      });
      return {
        ...data,
        publicAccessToken: jwt
      };
    });
  }
  /**
   * Phase 1 of 2-phase batch API: Create a batch
   *
   * Creates a new batch and returns its ID. For batchTriggerAndWait,
   * the parent run is blocked immediately on batch creation.
   *
   * @param body - The batch creation parameters
   * @param clientOptions - Options for trace context handling
   * @param clientOptions.spanParentAsLink - If true, child runs will have separate trace IDs with a link to parent
   * @param requestOptions - Optional request options
   * @returns The created batch with ID and metadata
   */
  createBatch(body, clientOptions, requestOptions) {
    return zodfetch(CreateBatchResponse, `${this.baseUrl}/api/v3/batches`, {
      method: "POST",
      headers: this.#getHeaders(clientOptions?.spanParentAsLink ?? false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions)).withResponse().then(async ({ data, response }) => {
      const claimsHeader = response.headers.get("x-trigger-jwt-claims");
      const claims = claimsHeader ? JSON.parse(claimsHeader) : void 0;
      const jwt = await generateJWT({
        secretKey: this.accessToken,
        payload: {
          ...claims,
          scopes: [`read:batch:${data.id}`]
        },
        expirationTime: requestOptions?.publicAccessToken?.expirationTime ?? "1h"
      });
      return {
        ...data,
        publicAccessToken: jwt
      };
    });
  }
  /**
   * Phase 2 of 2-phase batch API: Stream batch items
   *
   * Streams batch items as NDJSON to the server. Each item is enqueued
   * as it arrives. The batch is automatically sealed when the stream completes.
   *
   * Includes automatic retry with exponential backoff. Since items are deduplicated
   * by index on the server, retrying the entire stream is safe.
   *
   * Uses ReadableStream.tee() for retry capability without buffering all items
   * upfront - only items consumed before a failure are buffered for retry.
   *
   * @param batchId - The batch ID from createBatch
   * @param items - Array or async iterable of batch items
   * @param requestOptions - Optional request options
   * @returns Summary of items accepted and deduplicated
   */
  async streamBatchItems(batchId, items, requestOptions) {
    const stream2 = createNdjsonStream(items);
    const retryOptions = {
      ...DEFAULT_STREAM_BATCH_RETRY_OPTIONS,
      ...requestOptions?.retry
    };
    return this.#streamBatchItemsWithRetry(batchId, stream2, retryOptions);
  }
  async #streamBatchItemsWithRetry(batchId, stream2, retryOptions, attempt = 1) {
    const headers = this.#getHeaders(false);
    headers["Content-Type"] = "application/x-ndjson";
    const [forRequest, forRetry] = stream2.tee();
    try {
      const response = await fetch(`${this.baseUrl}/api/v3/batches/${batchId}/items`, {
        method: "POST",
        headers,
        body: forRequest,
        // @ts-expect-error - duplex is required for streaming body but not in types
        duplex: "half"
      });
      if (!response.ok) {
        const retryResult = shouldRetryStreamBatchItems(response, attempt, retryOptions);
        if (retryResult.retry) {
          await safeStreamCancel(forRequest);
          await sleep(retryResult.delay);
          return this.#streamBatchItemsWithRetry(batchId, forRetry, retryOptions, attempt + 1);
        }
        await safeStreamCancel(forRetry);
        const errText = await response.text().catch((e) => e.message);
        let errJSON;
        try {
          errJSON = JSON.parse(errText);
        } catch {
        }
        const errMessage = errJSON ? void 0 : errText;
        const responseHeaders = Object.fromEntries(response.headers.entries());
        throw ApiError.generate(response.status, errJSON, errMessage, responseHeaders);
      }
      const result = await response.json();
      const parsed = StreamBatchItemsResponse.safeParse(result);
      if (!parsed.success) {
        await safeStreamCancel(forRetry);
        throw new Error(`Invalid response from server for batch ${batchId}: ${parsed.error.message}`);
      }
      if (!parsed.data.sealed) {
        const delay = calculateNextRetryDelay(retryOptions, attempt);
        if (delay) {
          await safeStreamCancel(forRequest);
          await sleep(delay);
          return this.#streamBatchItemsWithRetry(batchId, forRetry, retryOptions, attempt + 1);
        }
        await safeStreamCancel(forRetry);
        throw new BatchNotSealedError({
          batchId,
          enqueuedCount: parsed.data.enqueuedCount ?? 0,
          expectedCount: parsed.data.expectedCount ?? 0,
          itemsAccepted: parsed.data.itemsAccepted,
          itemsDeduplicated: parsed.data.itemsDeduplicated
        });
      }
      await safeStreamCancel(forRetry);
      return parsed.data;
    } catch (error) {
      if (error instanceof BatchNotSealedError) {
        throw error;
      }
      if (error instanceof ApiError) {
        throw error;
      }
      const delay = calculateNextRetryDelay(retryOptions, attempt);
      if (delay) {
        await safeStreamCancel(forRequest);
        await sleep(delay);
        return this.#streamBatchItemsWithRetry(batchId, forRetry, retryOptions, attempt + 1);
      }
      await safeStreamCancel(forRetry);
      const cause = error instanceof Error ? error : new Error(String(error));
      throw new ApiConnectionError({
        cause,
        message: `Failed to stream batch items for batch ${batchId}: ${cause.message}`
      });
    }
  }
  createUploadPayloadUrl(filename, requestOptions) {
    return zodfetch(CreateUploadPayloadUrlResponseBody, `${this.baseUrl}/api/v1/packets/${filename}`, {
      method: "PUT",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  getPayloadUrl(filename, requestOptions) {
    return zodfetch(CreateUploadPayloadUrlResponseBody, `${this.baseUrl}/api/v1/packets/${filename}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  retrieveRun(runId, requestOptions) {
    return zodfetch(RetrieveRunResponse, `${this.baseUrl}/api/v3/runs/${runId}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  retrieveRunTrace(runId, requestOptions) {
    return zodfetch(RetrieveRunTraceResponseBody, `${this.baseUrl}/api/v1/runs/${runId}/trace`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  listRuns(query, requestOptions) {
    const searchParams = createSearchQueryForListRuns(query);
    return zodfetchCursorPage(ListRunResponseItem, `${this.baseUrl}/api/v1/runs`, {
      query: searchParams,
      limit: query?.limit,
      after: query?.after,
      before: query?.before
    }, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  listProjectRuns(projectRef, query, requestOptions) {
    const searchParams = createSearchQueryForListRuns(query);
    if (query?.env) {
      searchParams.append("filter[env]", Array.isArray(query.env) ? query.env.join(",") : query.env);
    }
    return zodfetchCursorPage(ListRunResponseItem, `${this.baseUrl}/api/v1/projects/${projectRef}/runs`, {
      query: searchParams,
      limit: query?.limit,
      after: query?.after,
      before: query?.before
    }, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  replayRun(runId, requestOptions) {
    return zodfetch(ReplayRunResponse, `${this.baseUrl}/api/v1/runs/${runId}/replay`, {
      method: "POST",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  cancelRun(runId, requestOptions) {
    return zodfetch(CanceledRunResponse, `${this.baseUrl}/api/v2/runs/${runId}/cancel`, {
      method: "POST",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  resetIdempotencyKey(taskIdentifier, idempotencyKey, requestOptions) {
    return zodfetch(ResetIdempotencyKeyResponse, `${this.baseUrl}/api/v1/idempotencyKeys/${encodeURIComponent(idempotencyKey)}/reset`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify({ taskIdentifier })
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  rescheduleRun(runId, body, requestOptions) {
    return zodfetch(RetrieveRunResponse, `${this.baseUrl}/api/v1/runs/${runId}/reschedule`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  listRunEvents(runId, requestOptions) {
    return zodfetch(
      external_exports.any(),
      // TODO: define a proper schema for this
      `${this.baseUrl}/api/v1/runs/${runId}/events`,
      {
        method: "GET",
        headers: this.#getHeaders(false)
      },
      mergeRequestOptions(this.defaultRequestOptions, requestOptions)
    );
  }
  addTags(runId, body, requestOptions) {
    return zodfetch(external_exports.object({ message: external_exports.string() }), `${this.baseUrl}/api/v1/runs/${runId}/tags`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  createSchedule(options, requestOptions) {
    return zodfetch(ScheduleObject, `${this.baseUrl}/api/v1/schedules`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify(options)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  listSchedules(options, requestOptions) {
    const searchParams = new URLSearchParams();
    if (options?.page) {
      searchParams.append("page", options.page.toString());
    }
    if (options?.perPage) {
      searchParams.append("perPage", options.perPage.toString());
    }
    return zodfetchOffsetLimitPage(ScheduleObject, `${this.baseUrl}/api/v1/schedules`, {
      page: options?.page,
      limit: options?.perPage
    }, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  retrieveSchedule(scheduleId, requestOptions) {
    return zodfetch(ScheduleObject, `${this.baseUrl}/api/v1/schedules/${scheduleId}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  updateSchedule(scheduleId, options, requestOptions) {
    return zodfetch(ScheduleObject, `${this.baseUrl}/api/v1/schedules/${scheduleId}`, {
      method: "PUT",
      headers: this.#getHeaders(false),
      body: JSON.stringify(options)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  deactivateSchedule(scheduleId, requestOptions) {
    return zodfetch(ScheduleObject, `${this.baseUrl}/api/v1/schedules/${scheduleId}/deactivate`, {
      method: "POST",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  activateSchedule(scheduleId, requestOptions) {
    return zodfetch(ScheduleObject, `${this.baseUrl}/api/v1/schedules/${scheduleId}/activate`, {
      method: "POST",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  deleteSchedule(scheduleId, requestOptions) {
    return zodfetch(DeletedScheduleObject, `${this.baseUrl}/api/v1/schedules/${scheduleId}`, {
      method: "DELETE",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  listEnvVars(projectRef, slug, requestOptions) {
    return zodfetch(external_exports.array(EnvironmentVariableWithSecret), `${this.baseUrl}/api/v1/projects/${projectRef}/envvars/${slug}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  importEnvVars(projectRef, slug, body, requestOptions) {
    return zodfetch(EnvironmentVariableResponseBody, `${this.baseUrl}/api/v1/projects/${projectRef}/envvars/${slug}/import`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  retrieveEnvVar(projectRef, slug, key, requestOptions) {
    return zodfetch(EnvironmentVariableWithSecret, `${this.baseUrl}/api/v1/projects/${projectRef}/envvars/${slug}/${key}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  createEnvVar(projectRef, slug, body, requestOptions) {
    return zodfetch(EnvironmentVariableResponseBody, `${this.baseUrl}/api/v1/projects/${projectRef}/envvars/${slug}`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  updateEnvVar(projectRef, slug, key, body, requestOptions) {
    return zodfetch(EnvironmentVariableResponseBody, `${this.baseUrl}/api/v1/projects/${projectRef}/envvars/${slug}/${key}`, {
      method: "PUT",
      headers: this.#getHeaders(false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  deleteEnvVar(projectRef, slug, key, requestOptions) {
    return zodfetch(EnvironmentVariableResponseBody, `${this.baseUrl}/api/v1/projects/${projectRef}/envvars/${slug}/${key}`, {
      method: "DELETE",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  updateRunMetadata(runId, body, requestOptions) {
    return zodfetch(UpdateMetadataResponseBody, `${this.baseUrl}/api/v1/runs/${runId}/metadata`, {
      method: "PUT",
      headers: this.#getHeaders(false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  getRunMetadata(runId, requestOptions) {
    return zodfetch(UpdateMetadataResponseBody, `${this.baseUrl}/api/v1/runs/${runId}/metadata`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  createWaitpointToken(options, requestOptions) {
    return zodfetch(CreateWaitpointTokenResponseBody, `${this.baseUrl}/api/v1/waitpoints/tokens`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify(options)
    }, {
      ...mergeRequestOptions(this.defaultRequestOptions, requestOptions),
      prepareData: async (data, response) => {
        const jwtHeader = response.headers.get("x-trigger-jwt");
        if (typeof jwtHeader === "string") {
          return {
            ...data,
            publicAccessToken: jwtHeader
          };
        }
        const claimsHeader = response.headers.get("x-trigger-jwt-claims");
        const claims = claimsHeader ? JSON.parse(claimsHeader) : void 0;
        const jwt = await generateJWT({
          secretKey: this.accessToken,
          payload: {
            ...claims,
            scopes: [`write:waitpoints:${data.id}`]
          },
          expirationTime: "24h"
        });
        return {
          ...data,
          publicAccessToken: jwt
        };
      }
    });
  }
  listWaitpointTokens(params, requestOptions) {
    const searchParams = createSearchQueryForListWaitpointTokens(params);
    return zodfetchCursorPage(WaitpointTokenItem, `${this.baseUrl}/api/v1/waitpoints/tokens`, {
      query: searchParams,
      limit: params?.limit,
      after: params?.after,
      before: params?.before
    }, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  retrieveWaitpointToken(friendlyId, requestOptions) {
    return zodfetch(WaitpointRetrieveTokenResponse, `${this.baseUrl}/api/v1/waitpoints/tokens/${friendlyId}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  completeWaitpointToken(friendlyId, options, requestOptions) {
    return zodfetch(CompleteWaitpointTokenResponseBody, `${this.baseUrl}/api/v1/waitpoints/tokens/${friendlyId}/complete`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify(options)
    }, {
      ...mergeRequestOptions(this.defaultRequestOptions, requestOptions)
    });
  }
  waitForWaitpointToken({ runFriendlyId, waitpointFriendlyId }, requestOptions) {
    return zodfetch(WaitForWaitpointTokenResponseBody, `${this.baseUrl}/engine/v1/runs/${runFriendlyId}/waitpoints/tokens/${waitpointFriendlyId}/wait`, {
      method: "POST",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  async waitForDuration(runId, body, requestOptions) {
    return zodfetch(WaitForDurationResponseBody, `${this.baseUrl}/engine/v1/runs/${runId}/wait/duration`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify(body)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  listQueues(options, requestOptions) {
    const searchParams = new URLSearchParams();
    if (options?.page) {
      searchParams.append("page", options.page.toString());
    }
    if (options?.perPage) {
      searchParams.append("perPage", options.perPage.toString());
    }
    return zodfetchOffsetLimitPage(QueueItem, `${this.baseUrl}/api/v1/queues`, {
      page: options?.page,
      limit: options?.perPage
    }, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  retrieveQueue(queue2, requestOptions) {
    const type = typeof queue2 === "string" ? "id" : queue2.type;
    const value = typeof queue2 === "string" ? queue2 : queue2.name;
    const encodedValue = encodeURIComponent(value.replace(/\//g, "%2F"));
    return zodfetch(QueueItem, `${this.baseUrl}/api/v1/queues/${encodedValue}?type=${type}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  pauseQueue(queue2, action, requestOptions) {
    const type = typeof queue2 === "string" ? "id" : queue2.type;
    const value = typeof queue2 === "string" ? queue2 : queue2.name;
    const encodedValue = encodeURIComponent(value.replace(/\//g, "%2F"));
    return zodfetch(QueueItem, `${this.baseUrl}/api/v1/queues/${encodedValue}/pause`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify({
        type,
        action
      })
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  overrideQueueConcurrencyLimit(queue2, concurrencyLimit, requestOptions) {
    const type = typeof queue2 === "string" ? "id" : queue2.type;
    const value = typeof queue2 === "string" ? queue2 : queue2.name;
    const encodedValue = encodeURIComponent(value.replace(/\//g, "%2F"));
    return zodfetch(QueueItem, `${this.baseUrl}/api/v1/queues/${encodedValue}/concurrency/override`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify({
        type,
        concurrencyLimit
      })
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  resetQueueConcurrencyLimit(queue2, requestOptions) {
    const type = typeof queue2 === "string" ? "id" : queue2.type;
    const value = typeof queue2 === "string" ? queue2 : queue2.name;
    const encodedValue = encodeURIComponent(value.replace(/\//g, "%2F"));
    return zodfetch(QueueItem, `${this.baseUrl}/api/v1/queues/${encodedValue}/concurrency/reset`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: JSON.stringify({
        type
      })
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  subscribeToRun(runId, options) {
    const queryParams = new URLSearchParams();
    if (options?.skipColumns) {
      queryParams.append("skipColumns", options.skipColumns.join(","));
    }
    return runShapeStream(`${this.baseUrl}/realtime/v1/runs/${runId}${queryParams ? `?${queryParams}` : ""}`, {
      closeOnComplete: typeof options?.closeOnComplete === "boolean" ? options.closeOnComplete : true,
      headers: this.#getRealtimeHeaders(),
      client: this,
      signal: options?.signal,
      onFetchError: options?.onFetchError
    });
  }
  subscribeToRunsWithTag(tag, filters, options) {
    const searchParams = createSearchQueryForSubscribeToRuns({
      tags: tag,
      ...filters ? { createdAt: filters.createdAt } : {},
      ...filters?.skipColumns ? { skipColumns: filters.skipColumns } : {}
    });
    return runShapeStream(`${this.baseUrl}/realtime/v1/runs${searchParams ? `?${searchParams}` : ""}`, {
      closeOnComplete: false,
      headers: this.#getRealtimeHeaders(),
      client: this,
      signal: options?.signal,
      onFetchError: options?.onFetchError
    });
  }
  subscribeToBatch(batchId, options) {
    const queryParams = new URLSearchParams();
    if (options?.skipColumns) {
      queryParams.append("skipColumns", options.skipColumns.join(","));
    }
    return runShapeStream(`${this.baseUrl}/realtime/v1/batches/${batchId}${queryParams ? `?${queryParams}` : ""}`, {
      closeOnComplete: false,
      headers: this.#getRealtimeHeaders(),
      client: this,
      signal: options?.signal,
      onFetchError: options?.onFetchError
    });
  }
  listDeployments(options, requestOptions) {
    const searchParams = new URLSearchParams();
    if (options?.status) {
      searchParams.append("status", options.status);
    }
    if (options?.period) {
      searchParams.append("period", options.period);
    }
    if (options?.from) {
      searchParams.append("from", options.from);
    }
    if (options?.to) {
      searchParams.append("to", options.to);
    }
    return zodfetchCursorPage(ApiDeploymentListResponseItem, `${this.baseUrl}/api/v1/deployments`, {
      query: searchParams,
      after: options?.cursor,
      limit: options?.limit
    }, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  async fetchStream(runId, streamKey, options) {
    const streamFactory = new SSEStreamSubscriptionFactory(options?.baseUrl ?? this.baseUrl, {
      headers: this.getHeaders(),
      signal: options?.signal
    });
    const subscription = streamFactory.createSubscription(runId, streamKey, {
      onComplete: options?.onComplete,
      onError: options?.onError,
      timeoutInSeconds: options?.timeoutInSeconds,
      lastEventId: options?.lastEventId
    });
    const stream2 = await subscription.subscribe();
    return stream2.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk.chunk);
      }
    }));
  }
  async createStream(runId, target, streamId, requestOptions) {
    return zodfetch(CreateStreamResponseBody, `${this.baseUrl}/realtime/v1/streams/${runId}/${target}/${streamId}`, {
      method: "PUT",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions)).withResponse().then(async ({ data, response }) => {
      return {
        ...data,
        headers: Object.fromEntries(response.headers.entries())
      };
    });
  }
  async appendToStream(runId, target, streamId, part, requestOptions) {
    return zodfetch(AppendToStreamResponseBody, `${this.baseUrl}/realtime/v1/streams/${runId}/${target}/${streamId}/append`, {
      method: "POST",
      headers: this.#getHeaders(false),
      body: part
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  async generateJWTClaims(requestOptions) {
    return zodfetch(external_exports.record(external_exports.any()), `${this.baseUrl}/api/v1/auth/jwt/claims`, {
      method: "POST",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  retrieveBatch(batchId, requestOptions) {
    return zodfetch(RetrieveBatchV2Response, `${this.baseUrl}/api/v2/batches/${batchId}`, {
      method: "GET",
      headers: this.#getHeaders(false)
    }, mergeRequestOptions(this.defaultRequestOptions, requestOptions));
  }
  #getHeaders(spanParentAsLink, additionalHeaders) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
      "trigger-version": VERSION,
      ...Object.entries(additionalHeaders ?? {}).reduce((acc, [key, value]) => {
        if (value !== void 0) {
          acc[key] = value;
        }
        return acc;
      }, {})
    };
    if (this.previewBranch) {
      headers["x-trigger-branch"] = this.previewBranch;
    }
    if (taskContext.isInsideTask) {
      headers["x-trigger-worker"] = "true";
      headers["x-trigger-engine-version"] = "V2";
      if (spanParentAsLink) {
        headers["x-trigger-span-parent-as-link"] = "1";
      }
    }
    if (typeof window !== "undefined" && typeof window.document !== "undefined") {
      headers["x-trigger-client"] = "browser";
    }
    headers[API_VERSION_HEADER_NAME] = API_VERSION;
    const streamFlag = this.futureFlags.v2RealtimeStreams ?? true;
    if (streamFlag === false || getEnvVar("TRIGGER_V2_REALTIME_STREAMS") === "0" || getEnvVar("TRIGGER_V2_REALTIME_STREAMS") === "false" || getEnvVar("TRIGGER_REALTIME_STREAMS_V2") === "0" || getEnvVar("TRIGGER_REALTIME_STREAMS_V2") === "false") {
      headers["x-trigger-realtime-streams-version"] = "v1";
    } else {
      headers["x-trigger-realtime-streams-version"] = "v2";
    }
    return headers;
  }
  #getRealtimeHeaders() {
    let headers = {
      Authorization: `Bearer ${this.accessToken}`,
      "trigger-version": VERSION
    };
    if (this.previewBranch) {
      headers["x-trigger-branch"] = this.previewBranch;
    }
    return headers;
  }
};
function createSearchQueryForSubscribeToRuns(query) {
  const searchParams = new URLSearchParams();
  if (query) {
    if (query.tasks) {
      searchParams.append("tasks", Array.isArray(query.tasks) ? query.tasks.join(",") : query.tasks);
    }
    if (query.tags) {
      searchParams.append("tags", Array.isArray(query.tags) ? query.tags.join(",") : query.tags);
    }
    if (query.createdAt) {
      searchParams.append("createdAt", query.createdAt);
    }
    if (query.skipColumns) {
      searchParams.append("skipColumns", query.skipColumns.join(","));
    }
  }
  return searchParams;
}
function createSearchQueryForListRuns(query) {
  const searchParams = new URLSearchParams();
  if (query) {
    if (query.status) {
      searchParams.append("filter[status]", Array.isArray(query.status) ? query.status.join(",") : query.status);
    }
    if (query.taskIdentifier) {
      searchParams.append("filter[taskIdentifier]", Array.isArray(query.taskIdentifier) ? query.taskIdentifier.join(",") : query.taskIdentifier);
    }
    if (query.version) {
      searchParams.append("filter[version]", Array.isArray(query.version) ? query.version.join(",") : query.version);
    }
    if (query.bulkAction) {
      searchParams.append("filter[bulkAction]", query.bulkAction);
    }
    if (query.tag) {
      searchParams.append("filter[tag]", Array.isArray(query.tag) ? query.tag.join(",") : query.tag);
    }
    if (query.schedule) {
      searchParams.append("filter[schedule]", query.schedule);
    }
    if (typeof query.isTest === "boolean") {
      searchParams.append("filter[isTest]", String(query.isTest));
    }
    if (query.from) {
      searchParams.append("filter[createdAt][from]", query.from instanceof Date ? query.from.getTime().toString() : query.from.toString());
    }
    if (query.to) {
      searchParams.append("filter[createdAt][to]", query.to instanceof Date ? query.to.getTime().toString() : query.to.toString());
    }
    if (query.period) {
      searchParams.append("filter[createdAt][period]", query.period);
    }
    if (query.batch) {
      searchParams.append("filter[batch]", query.batch);
    }
    if (query.queue) {
      searchParams.append("filter[queue]", Array.isArray(query.queue) ? query.queue.map((q) => queueNameFromQueueTypeName(q)).join(",") : queueNameFromQueueTypeName(query.queue));
    }
    if (query.machine) {
      searchParams.append("filter[machine]", Array.isArray(query.machine) ? query.machine.join(",") : query.machine);
    }
  }
  return searchParams;
}
function queueNameFromQueueTypeName(queue2) {
  if (queue2.type === "task") {
    return `task/${queue2.name}`;
  }
  return queue2.name;
}
function createSearchQueryForListWaitpointTokens(query) {
  const searchParams = new URLSearchParams();
  if (query) {
    if (query.status) {
      searchParams.append("filter[status]", Array.isArray(query.status) ? query.status.join(",") : query.status);
    }
    if (query.idempotencyKey) {
      searchParams.append("filter[idempotencyKey]", query.idempotencyKey);
    }
    if (query.tags) {
      searchParams.append("filter[tags]", Array.isArray(query.tags) ? query.tags.join(",") : query.tags);
    }
    if (query.period) {
      searchParams.append("filter[createdAt][period]", query.period);
    }
    if (query.from) {
      searchParams.append("filter[createdAt][from]", query.from instanceof Date ? query.from.getTime().toString() : query.from.toString());
    }
    if (query.to) {
      searchParams.append("filter[createdAt][to]", query.to instanceof Date ? query.to.getTime().toString() : query.to.toString());
    }
  }
  return searchParams;
}
var DEFAULT_STREAM_BATCH_RETRY_OPTIONS = {
  maxAttempts: 5,
  factor: 2,
  minTimeoutInMs: 1e3,
  maxTimeoutInMs: 3e4,
  randomize: true
};
function shouldRetryStreamBatchItems(response, attempt, retryOptions) {
  function shouldRetryForOptions() {
    const delay = calculateNextRetryDelay(retryOptions, attempt);
    if (delay) {
      return { retry: true, delay };
    }
    return { retry: false };
  }
  const shouldRetryHeader = response.headers.get("x-should-retry");
  if (shouldRetryHeader === "true")
    return shouldRetryForOptions();
  if (shouldRetryHeader === "false")
    return { retry: false };
  if (response.status === 408)
    return shouldRetryForOptions();
  if (response.status === 409)
    return shouldRetryForOptions();
  if (response.status === 429) {
    if (attempt >= retryOptions.maxAttempts) {
      return { retry: false };
    }
    const resetAtUnixEpochMs = response.headers.get("x-ratelimit-reset");
    if (resetAtUnixEpochMs) {
      const resetAtUnixEpoch = parseInt(resetAtUnixEpochMs, 10);
      const delay = resetAtUnixEpoch - Date.now() + Math.floor(Math.random() * 1e3);
      if (delay > 0) {
        return { retry: true, delay };
      }
    }
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) {
      const retryAfterSeconds = parseInt(retryAfter, 10);
      if (!isNaN(retryAfterSeconds)) {
        return { retry: true, delay: retryAfterSeconds * 1e3 };
      }
    }
    return shouldRetryForOptions();
  }
  if (response.status >= 500)
    return shouldRetryForOptions();
  return { retry: false };
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function safeStreamCancel(stream2) {
  try {
    await stream2.cancel();
  } catch (error) {
    if (error instanceof TypeError && String(error).includes("locked")) {
      return;
    }
    throw error;
  }
}
function createNdjsonStream(items) {
  const encoder = new TextEncoder();
  if (Array.isArray(items)) {
    let index = 0;
    return new ReadableStream({
      pull(controller) {
        if (index >= items.length) {
          controller.close();
          return;
        }
        const item = items[index++];
        const line = JSON.stringify(item) + "\n";
        controller.enqueue(encoder.encode(line));
      }
    });
  }
  const iterator = items[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
        return;
      }
      const line = JSON.stringify(value) + "\n";
      controller.enqueue(encoder.encode(line));
    }
  });
}
function mergeRequestOptions(defaultOptions, options) {
  if (!options) {
    return defaultOptions;
  }
  return {
    ...defaultOptions,
    ...options,
    retry: {
      ...defaultOptions.retry,
      ...options.retry
    }
  };
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/clock/simpleClock.js
var import_precise_date = __toESM(require_src(), 1);
var SimpleClock = class {
  preciseNow() {
    const now = new import_precise_date.PreciseDate();
    const nowStruct = now.toStruct();
    return [nowStruct.seconds, nowStruct.nanos];
  }
  reset() {
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/clock/index.js
var API_NAME7 = "clock";
var SIMPLE_CLOCK = new SimpleClock();
var ClockAPI = class _ClockAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _ClockAPI();
    }
    return this._instance;
  }
  setGlobalClock(clock2) {
    return registerGlobal(API_NAME7, clock2);
  }
  preciseNow() {
    return this.#getClock().preciseNow();
  }
  reset() {
    this.#getClock().reset();
  }
  #getClock() {
    return getGlobal(API_NAME7) ?? SIMPLE_CLOCK;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/clock-api.js
var clock = ClockAPI.getInstance();

// ../../node_modules/.pnpm/@opentelemetry+api-logs@0.203.0/node_modules/@opentelemetry/api-logs/build/esm/NoopLogger.js
var NoopLogger = class {
  emit(_logRecord) {
  }
};
var NOOP_LOGGER = new NoopLogger();

// ../../node_modules/.pnpm/@opentelemetry+api-logs@0.203.0/node_modules/@opentelemetry/api-logs/build/esm/NoopLoggerProvider.js
var NoopLoggerProvider = class {
  getLogger(_name, _version, _options) {
    return new NoopLogger();
  }
};
var NOOP_LOGGER_PROVIDER = new NoopLoggerProvider();

// ../../node_modules/.pnpm/@opentelemetry+api-logs@0.203.0/node_modules/@opentelemetry/api-logs/build/esm/ProxyLogger.js
var ProxyLogger = class {
  constructor(_provider, name2, version, options) {
    this._provider = _provider;
    this.name = name2;
    this.version = version;
    this.options = options;
  }
  /**
   * Emit a log record. This method should only be used by log appenders.
   *
   * @param logRecord
   */
  emit(logRecord) {
    this._getLogger().emit(logRecord);
  }
  /**
   * Try to get a logger from the proxy logger provider.
   * If the proxy logger provider has no delegate, return a noop logger.
   */
  _getLogger() {
    if (this._delegate) {
      return this._delegate;
    }
    const logger2 = this._provider.getDelegateLogger(this.name, this.version, this.options);
    if (!logger2) {
      return NOOP_LOGGER;
    }
    this._delegate = logger2;
    return this._delegate;
  }
};

// ../../node_modules/.pnpm/@opentelemetry+api-logs@0.203.0/node_modules/@opentelemetry/api-logs/build/esm/ProxyLoggerProvider.js
var ProxyLoggerProvider = class {
  getLogger(name2, version, options) {
    var _a;
    return (_a = this.getDelegateLogger(name2, version, options)) !== null && _a !== void 0 ? _a : new ProxyLogger(this, name2, version, options);
  }
  getDelegate() {
    var _a;
    return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_LOGGER_PROVIDER;
  }
  /**
   * Set the delegate logger provider
   */
  setDelegate(delegate) {
    this._delegate = delegate;
  }
  getDelegateLogger(name2, version, options) {
    var _a;
    return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getLogger(name2, version, options);
  }
};

// ../../node_modules/.pnpm/@opentelemetry+api-logs@0.203.0/node_modules/@opentelemetry/api-logs/build/esm/platform/node/globalThis.js
var _globalThis3 = typeof globalThis === "object" ? globalThis : global;

// ../../node_modules/.pnpm/@opentelemetry+api-logs@0.203.0/node_modules/@opentelemetry/api-logs/build/esm/internal/global-utils.js
var GLOBAL_LOGS_API_KEY = /* @__PURE__ */ Symbol.for("io.opentelemetry.js.api.logs");
var _global3 = _globalThis3;
function makeGetter(requiredVersion, instance, fallback) {
  return (version) => version === requiredVersion ? instance : fallback;
}
var API_BACKWARDS_COMPATIBILITY_VERSION = 1;

// ../../node_modules/.pnpm/@opentelemetry+api-logs@0.203.0/node_modules/@opentelemetry/api-logs/build/esm/api/logs.js
var LogsAPI = class _LogsAPI {
  constructor() {
    this._proxyLoggerProvider = new ProxyLoggerProvider();
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _LogsAPI();
    }
    return this._instance;
  }
  setGlobalLoggerProvider(provider) {
    if (_global3[GLOBAL_LOGS_API_KEY]) {
      return this.getLoggerProvider();
    }
    _global3[GLOBAL_LOGS_API_KEY] = makeGetter(API_BACKWARDS_COMPATIBILITY_VERSION, provider, NOOP_LOGGER_PROVIDER);
    this._proxyLoggerProvider.setDelegate(provider);
    return provider;
  }
  /**
   * Returns the global logger provider.
   *
   * @returns LoggerProvider
   */
  getLoggerProvider() {
    var _a, _b;
    return (_b = (_a = _global3[GLOBAL_LOGS_API_KEY]) === null || _a === void 0 ? void 0 : _a.call(_global3, API_BACKWARDS_COMPATIBILITY_VERSION)) !== null && _b !== void 0 ? _b : this._proxyLoggerProvider;
  }
  /**
   * Returns a logger from the global logger provider.
   *
   * @returns Logger
   */
  getLogger(name2, version, options) {
    return this.getLoggerProvider().getLogger(name2, version, options);
  }
  /** Remove the global logger provider */
  disable() {
    delete _global3[GLOBAL_LOGS_API_KEY];
    this._proxyLoggerProvider = new ProxyLoggerProvider();
  }
};

// ../../node_modules/.pnpm/@opentelemetry+api-logs@0.203.0/node_modules/@opentelemetry/api-logs/build/esm/index.js
var logs = LogsAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/logger/taskLogger.js
var NoopTaskLogger = class {
  debug() {
  }
  log() {
  }
  info() {
  }
  warn() {
  }
  error() {
  }
  trace(name2, fn) {
    return fn({});
  }
  startSpan() {
    return {};
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/logger/index.js
var API_NAME8 = "logger";
var NOOP_TASK_LOGGER = new NoopTaskLogger();
var LoggerAPI = class _LoggerAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _LoggerAPI();
    }
    return this._instance;
  }
  disable() {
    unregisterGlobal(API_NAME8);
  }
  setGlobalTaskLogger(taskLogger) {
    return registerGlobal(API_NAME8, taskLogger);
  }
  debug(message, metadata2) {
    this.#getTaskLogger().debug(message, metadata2);
  }
  log(message, metadata2) {
    this.#getTaskLogger().log(message, metadata2);
  }
  info(message, metadata2) {
    this.#getTaskLogger().info(message, metadata2);
  }
  warn(message, metadata2) {
    this.#getTaskLogger().warn(message, metadata2);
  }
  error(message, metadata2) {
    this.#getTaskLogger().error(message, metadata2);
  }
  trace(name2, fn, options) {
    return this.#getTaskLogger().trace(name2, fn, options);
  }
  startSpan(name2, options) {
    return this.#getTaskLogger().startSpan(name2, options);
  }
  #getTaskLogger() {
    return getGlobal(API_NAME8) ?? NOOP_TASK_LOGGER;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/logger-api.js
var logger = LoggerAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/runtime/noopRuntimeManager.js
var NoopRuntimeManager = class {
  disable() {
  }
  waitForWaitpoint(params) {
    return Promise.resolve({
      ok: true
    });
  }
  waitForTask(params) {
    return Promise.resolve({
      ok: false,
      id: params.id,
      error: {
        type: "INTERNAL_ERROR",
        code: TaskRunErrorCodes.CONFIGURED_INCORRECTLY
      }
    });
  }
  waitForBatch(params) {
    return Promise.resolve({
      id: params.id,
      items: []
    });
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/usage/noopUsageManager.js
var NoopUsageManager = class {
  disable() {
  }
  async flush() {
  }
  start() {
    return {
      sample: () => ({ cpuTime: 0, wallTime: 0 })
    };
  }
  stop(measurement) {
    return measurement.sample();
  }
  pauseAsync(cb) {
    return cb();
  }
  sample() {
    return void 0;
  }
  reset() {
  }
  getInitialState() {
    return {
      cpuTime: 0,
      costInCents: 0
    };
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/usage/api.js
var API_NAME9 = "usage";
var NOOP_USAGE_MANAGER = new NoopUsageManager();
var UsageAPI = class _UsageAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _UsageAPI();
    }
    return this._instance;
  }
  setGlobalUsageManager(manager) {
    return registerGlobal(API_NAME9, manager);
  }
  disable() {
    this.#getUsageManager().disable();
    unregisterGlobal(API_NAME9);
  }
  start() {
    return this.#getUsageManager().start();
  }
  stop(measurement) {
    return this.#getUsageManager().stop(measurement);
  }
  pauseAsync(cb) {
    return this.#getUsageManager().pauseAsync(cb);
  }
  sample() {
    return this.#getUsageManager().sample();
  }
  flush() {
    return this.#getUsageManager().flush();
  }
  reset() {
    this.#getUsageManager().reset();
    this.disable();
  }
  getInitialState() {
    return this.#getUsageManager().getInitialState();
  }
  #getUsageManager() {
    return getGlobal(API_NAME9) ?? NOOP_USAGE_MANAGER;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/usage-api.js
var usage = UsageAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/runtime/index.js
var API_NAME10 = "runtime";
var NOOP_RUNTIME_MANAGER = new NoopRuntimeManager();
var RuntimeAPI = class _RuntimeAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _RuntimeAPI();
    }
    return this._instance;
  }
  waitUntil(waitpointFriendlyId, finishDate) {
    return usage.pauseAsync(() => this.#getRuntimeManager().waitForWaitpoint({ waitpointFriendlyId, finishDate }));
  }
  waitForTask(params) {
    return usage.pauseAsync(() => this.#getRuntimeManager().waitForTask(params));
  }
  waitForToken(waitpointFriendlyId) {
    return usage.pauseAsync(() => this.#getRuntimeManager().waitForWaitpoint({ waitpointFriendlyId }));
  }
  waitForBatch(params) {
    return usage.pauseAsync(() => this.#getRuntimeManager().waitForBatch(params));
  }
  setGlobalRuntimeManager(runtimeManager) {
    return registerGlobal(API_NAME10, runtimeManager);
  }
  disable() {
    this.#getRuntimeManager().disable();
    unregisterGlobal(API_NAME10);
  }
  #getRuntimeManager() {
    return getGlobal(API_NAME10) ?? NOOP_RUNTIME_MANAGER;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/runtime-api.js
var runtime = RuntimeAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/traceContext/api.js
var API_NAME11 = "trace-context";
var NoopTraceContextManager = class {
  getTraceContext() {
    return {};
  }
  reset() {
  }
  getExternalTraceContext() {
    return void 0;
  }
  extractContext() {
    return context.active();
  }
  withExternalTrace(fn) {
    return fn();
  }
};
var NOOP_TRACE_CONTEXT_MANAGER = new NoopTraceContextManager();
var TraceContextAPI = class _TraceContextAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _TraceContextAPI();
    }
    return this._instance;
  }
  setGlobalManager(manager) {
    return registerGlobal(API_NAME11, manager);
  }
  disable() {
    unregisterGlobal(API_NAME11);
  }
  reset() {
    this.#getManager().reset();
    this.disable();
  }
  getTraceContext() {
    return this.#getManager().getTraceContext();
  }
  getExternalTraceContext() {
    return this.#getManager().getExternalTraceContext();
  }
  extractContext() {
    return this.#getManager().extractContext();
  }
  withExternalTrace(fn) {
    return this.#getManager().withExternalTrace(fn);
  }
  #getManager() {
    return getGlobal(API_NAME11) ?? NOOP_TRACE_CONTEXT_MANAGER;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/trace-context-api.js
var traceContext = TraceContextAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/runMetadata/noopManager.js
var NoopRunMetadataManager = class {
  append(key, value) {
    throw new Error("Method not implemented.");
  }
  remove(key, value) {
    throw new Error("Method not implemented.");
  }
  increment(key, value) {
    throw new Error("Method not implemented.");
  }
  decrement(key, value) {
    throw new Error("Method not implemented.");
  }
  stream(key, value) {
    throw new Error("Method not implemented.");
  }
  fetchStream(key, signal) {
    throw new Error("Method not implemented.");
  }
  flush(requestOptions) {
    throw new Error("Method not implemented.");
  }
  refresh(requestOptions) {
    throw new Error("Method not implemented.");
  }
  enterWithMetadata(metadata2) {
  }
  current() {
    throw new Error("Method not implemented.");
  }
  getKey(key) {
    throw new Error("Method not implemented.");
  }
  set(key, value) {
    throw new Error("Method not implemented.");
  }
  del(key) {
    throw new Error("Method not implemented.");
  }
  update(metadata2) {
    throw new Error("Method not implemented.");
  }
  get parent() {
    const self = this;
    const parentUpdater = {
      append: () => parentUpdater,
      set: () => parentUpdater,
      del: () => parentUpdater,
      increment: () => parentUpdater,
      decrement: () => parentUpdater,
      remove: () => parentUpdater,
      stream: () => Promise.resolve({
        [Symbol.asyncIterator]: () => ({
          next: () => Promise.resolve({ done: true, value: void 0 })
        })
      }),
      update: () => parentUpdater
    };
    return parentUpdater;
  }
  get root() {
    const self = this;
    const rootUpdater = {
      append: () => rootUpdater,
      set: () => rootUpdater,
      del: () => rootUpdater,
      increment: () => rootUpdater,
      decrement: () => rootUpdater,
      remove: () => rootUpdater,
      stream: () => Promise.resolve({
        [Symbol.asyncIterator]: () => ({
          next: () => Promise.resolve({ done: true, value: void 0 })
        })
      }),
      update: () => rootUpdater
    };
    return rootUpdater;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/runMetadata/index.js
var API_NAME12 = "run-metadata";
var NOOP_MANAGER = new NoopRunMetadataManager();
var RunMetadataAPI = class _RunMetadataAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _RunMetadataAPI();
    }
    return this._instance;
  }
  setGlobalManager(manager) {
    return registerGlobal(API_NAME12, manager);
  }
  #getManager() {
    return getGlobal(API_NAME12) ?? NOOP_MANAGER;
  }
  enterWithMetadata(metadata2) {
    this.#getManager().enterWithMetadata(metadata2);
  }
  current() {
    return this.#getManager().current();
  }
  getKey(key) {
    return this.#getManager().getKey(key);
  }
  set(key, value) {
    this.#getManager().set(key, value);
    return this;
  }
  del(key) {
    this.#getManager().del(key);
    return this;
  }
  increment(key, value) {
    this.#getManager().increment(key, value);
    return this;
  }
  decrement(key, value) {
    this.#getManager().decrement(key, value);
    return this;
  }
  append(key, value) {
    this.#getManager().append(key, value);
    return this;
  }
  remove(key, value) {
    this.#getManager().remove(key, value);
    return this;
  }
  update(metadata2) {
    this.#getManager().update(metadata2);
    return this;
  }
  stream(key, value, signal) {
    return this.#getManager().stream(key, value, signal);
  }
  fetchStream(key, signal) {
    return this.#getManager().fetchStream(key, signal);
  }
  flush(requestOptions) {
    return this.#getManager().flush(requestOptions);
  }
  refresh(requestOptions) {
    return this.#getManager().refresh(requestOptions);
  }
  get parent() {
    return this.#getManager().parent;
  }
  get root() {
    return this.#getManager().root;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/runMetadata/operations.js
var import_path2 = __toESM(require_lib(), 1);

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/run-metadata-api.js
var runMetadata = RunMetadataAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/waitUntil/index.js
var API_NAME13 = "wait-until";
var NoopManager = class {
  register(promise) {
  }
  blockUntilSettled() {
    return Promise.resolve();
  }
  requiresResolving() {
    return false;
  }
};
var NOOP_MANAGER2 = new NoopManager();
var WaitUntilAPI = class _WaitUntilAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _WaitUntilAPI();
    }
    return this._instance;
  }
  setGlobalManager(manager) {
    return registerGlobal(API_NAME13, manager);
  }
  #getManager() {
    return getGlobal(API_NAME13) ?? NOOP_MANAGER2;
  }
  register(promise) {
    return this.#getManager().register(promise);
  }
  blockUntilSettled() {
    return this.#getManager().blockUntilSettled();
  }
  requiresResolving() {
    return this.#getManager().requiresResolving();
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/wait-until-api.js
var waitUntil = WaitUntilAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/timeout/api.js
var API_NAME14 = "timeout";
var NoopTimeoutManager = class {
  abortAfterTimeout(timeoutInSeconds) {
    return new AbortController();
  }
  reset() {
  }
};
var NOOP_TIMEOUT_MANAGER = new NoopTimeoutManager();
var TimeoutAPI = class _TimeoutAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _TimeoutAPI();
    }
    return this._instance;
  }
  get signal() {
    return this.#getManager().signal;
  }
  abortAfterTimeout(timeoutInSeconds) {
    return this.#getManager().abortAfterTimeout(timeoutInSeconds);
  }
  setGlobalManager(manager) {
    return registerGlobal(API_NAME14, manager);
  }
  disable() {
    unregisterGlobal(API_NAME14);
  }
  reset() {
    this.#getManager().reset();
    this.disable();
  }
  registerListener(listener) {
    const manager = this.#getManager();
    if (manager.registerListener) {
      manager.registerListener(listener);
    }
  }
  #getManager() {
    return getGlobal(API_NAME14) ?? NOOP_TIMEOUT_MANAGER;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/timeout-api.js
var timeout = TimeoutAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/runTimelineMetrics/runTimelineMetricsManager.js
var NoopRunTimelineMetricsManager = class {
  registerMetric(metric) {
  }
  getMetrics() {
    return [];
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/runTimelineMetrics/index.js
var API_NAME15 = "run-timeline-metrics";
var NOOP_MANAGER3 = new NoopRunTimelineMetricsManager();
var RunTimelineMetricsAPI = class _RunTimelineMetricsAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _RunTimelineMetricsAPI();
    }
    return this._instance;
  }
  registerMetric(metric) {
    this.#getManager().registerMetric(metric);
  }
  getMetrics() {
    return this.#getManager().getMetrics();
  }
  /**
   * Measures the execution time of an async function and registers it as a metric
   * @param metricName The name of the metric
   * @param eventName The event name
   * @param attributesOrCallback Optional attributes or the callback function
   * @param callbackFn The async function to measure (if attributes were provided)
   * @returns The result of the callback function
   */
  async measureMetric(metricName, eventName, attributesOrCallback, callbackFn) {
    let attributes = {};
    let callback;
    if (typeof attributesOrCallback === "function") {
      callback = attributesOrCallback;
    } else {
      attributes = attributesOrCallback || {};
      if (!callbackFn) {
        throw new Error("Callback function is required when attributes are provided");
      }
      callback = callbackFn;
    }
    const startTime = Date.now();
    try {
      const result = await callback();
      const duration = Date.now() - startTime;
      this.registerMetric({
        name: metricName,
        event: eventName,
        attributes: {
          ...attributes,
          duration
        },
        timestamp: startTime
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.registerMetric({
        name: metricName,
        event: eventName,
        attributes: {
          ...attributes,
          duration,
          error: error instanceof Error ? error.message : String(error),
          status: "failed"
        },
        timestamp: startTime
      });
      throw error;
    }
  }
  convertMetricsToSpanEvents() {
    const metrics = this.getMetrics();
    const spanEvents = metrics.map((metric) => {
      return {
        name: metric.name,
        startTime: metric.timestamp,
        attributes: {
          ...metric.attributes,
          event: metric.event
        }
      };
    });
    return spanEvents;
  }
  convertMetricsToSpanAttributes() {
    const metrics = this.getMetrics();
    if (metrics.length === 0) {
      return {};
    }
    const metricsByName = metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    }, {});
    const reducedMetrics = metrics.reduce((acc, metric) => {
      acc[metric.event] = {
        name: metric.name,
        timestamp: metric.timestamp,
        event: metric.event,
        ...flattenAttributes(metric.attributes, "attributes")
      };
      return acc;
    }, {});
    const metricEventRollups = {};
    for (const [metricName, metricEvents] of Object.entries(metricsByName)) {
      if (metricEvents.length === 0)
        continue;
      const sortedEvents = [...metricEvents].sort((a2, b2) => a2.timestamp - b2.timestamp);
      const firstTimestamp = sortedEvents[0].timestamp;
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      const lastEventDuration = lastEvent.attributes?.duration ?? 0;
      const lastEventEndTime = lastEvent.timestamp + lastEventDuration;
      const duration = lastEventEndTime - firstTimestamp;
      const timestamp = firstTimestamp;
      metricEventRollups[metricName] = {
        name: metricName,
        duration,
        timestamp
      };
    }
    return {
      ...flattenAttributes(reducedMetrics, SemanticInternalAttributes.METRIC_EVENTS),
      ...flattenAttributes(metricEventRollups, SemanticInternalAttributes.METRIC_EVENTS)
    };
  }
  setGlobalManager(manager) {
    return registerGlobal(API_NAME15, manager);
  }
  #getManager() {
    return getGlobal(API_NAME15) ?? NOOP_MANAGER3;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/run-timeline-metrics-api.js
var runTimelineMetrics = RunTimelineMetricsAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/lifecycleHooks/manager.js
var NoopLifecycleHooksManager = class {
  registerOnCancelHookListener(listener) {
  }
  async callOnCancelHookListeners() {
  }
  registerGlobalCancelHook(hook) {
  }
  registerTaskCancelHook(taskId, hook) {
  }
  getTaskCancelHook(taskId) {
    return void 0;
  }
  getGlobalCancelHooks() {
    return [];
  }
  registerOnWaitHookListener(listener) {
  }
  async callOnWaitHookListeners(wait2) {
  }
  registerOnResumeHookListener(listener) {
  }
  async callOnResumeHookListeners(wait2) {
  }
  registerGlobalInitHook(hook) {
  }
  registerTaskInitHook(taskId, hook) {
  }
  getTaskInitHook(taskId) {
    return void 0;
  }
  getGlobalInitHooks() {
    return [];
  }
  registerGlobalStartHook(hook) {
  }
  registerTaskStartHook(taskId, hook) {
  }
  getTaskStartHook(taskId) {
    return void 0;
  }
  getGlobalStartHooks() {
    return [];
  }
  registerGlobalStartAttemptHook() {
  }
  registerTaskStartAttemptHook() {
  }
  getTaskStartAttemptHook() {
    return void 0;
  }
  getGlobalStartAttemptHooks() {
    return [];
  }
  registerGlobalFailureHook(hook) {
  }
  registerTaskFailureHook(taskId, hook) {
  }
  getTaskFailureHook(taskId) {
    return void 0;
  }
  getGlobalFailureHooks() {
    return [];
  }
  registerGlobalSuccessHook(hook) {
  }
  registerTaskSuccessHook(taskId, hook) {
  }
  getTaskSuccessHook(taskId) {
    return void 0;
  }
  getGlobalSuccessHooks() {
    return [];
  }
  registerGlobalCompleteHook(hook) {
  }
  registerTaskCompleteHook(taskId, hook) {
  }
  getTaskCompleteHook(taskId) {
    return void 0;
  }
  getGlobalCompleteHooks() {
    return [];
  }
  registerGlobalWaitHook(hook) {
  }
  registerTaskWaitHook(taskId, hook) {
  }
  getTaskWaitHook(taskId) {
    return void 0;
  }
  getGlobalWaitHooks() {
    return [];
  }
  registerGlobalResumeHook(hook) {
  }
  registerTaskResumeHook(taskId, hook) {
  }
  getTaskResumeHook(taskId) {
    return void 0;
  }
  getGlobalResumeHooks() {
    return [];
  }
  registerGlobalCatchErrorHook() {
  }
  registerTaskCatchErrorHook() {
  }
  getTaskCatchErrorHook() {
    return void 0;
  }
  getGlobalCatchErrorHooks() {
    return [];
  }
  registerGlobalMiddlewareHook() {
  }
  registerTaskMiddlewareHook() {
  }
  getTaskMiddlewareHook() {
    return void 0;
  }
  getGlobalMiddlewareHooks() {
    return [];
  }
  registerGlobalCleanupHook(hook) {
  }
  registerTaskCleanupHook(taskId, hook) {
  }
  getTaskCleanupHook(taskId) {
    return void 0;
  }
  getGlobalCleanupHooks() {
    return [];
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/lifecycleHooks/index.js
var API_NAME16 = "lifecycle-hooks";
var NOOP_LIFECYCLE_HOOKS_MANAGER = new NoopLifecycleHooksManager();
var LifecycleHooksAPI = class _LifecycleHooksAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _LifecycleHooksAPI();
    }
    return this._instance;
  }
  setGlobalLifecycleHooksManager(lifecycleHooksManager) {
    return registerGlobal(API_NAME16, lifecycleHooksManager);
  }
  disable() {
    unregisterGlobal(API_NAME16);
  }
  registerGlobalInitHook(hook) {
    this.#getManager().registerGlobalInitHook(hook);
  }
  registerTaskInitHook(taskId, hook) {
    this.#getManager().registerTaskInitHook(taskId, hook);
  }
  getTaskInitHook(taskId) {
    return this.#getManager().getTaskInitHook(taskId);
  }
  getGlobalInitHooks() {
    return this.#getManager().getGlobalInitHooks();
  }
  registerTaskStartHook(taskId, hook) {
    this.#getManager().registerTaskStartHook(taskId, hook);
  }
  registerGlobalStartHook(hook) {
    this.#getManager().registerGlobalStartHook(hook);
  }
  getTaskStartHook(taskId) {
    return this.#getManager().getTaskStartHook(taskId);
  }
  getGlobalStartHooks() {
    return this.#getManager().getGlobalStartHooks();
  }
  registerTaskStartAttemptHook(taskId, hook) {
    this.#getManager().registerTaskStartAttemptHook(taskId, hook);
  }
  registerGlobalStartAttemptHook(hook) {
    this.#getManager().registerGlobalStartAttemptHook(hook);
  }
  getTaskStartAttemptHook(taskId) {
    return this.#getManager().getTaskStartAttemptHook(taskId);
  }
  getGlobalStartAttemptHooks() {
    return this.#getManager().getGlobalStartAttemptHooks();
  }
  registerGlobalFailureHook(hook) {
    this.#getManager().registerGlobalFailureHook(hook);
  }
  registerTaskFailureHook(taskId, hook) {
    this.#getManager().registerTaskFailureHook(taskId, hook);
  }
  getTaskFailureHook(taskId) {
    return this.#getManager().getTaskFailureHook(taskId);
  }
  getGlobalFailureHooks() {
    return this.#getManager().getGlobalFailureHooks();
  }
  registerGlobalSuccessHook(hook) {
    this.#getManager().registerGlobalSuccessHook(hook);
  }
  registerTaskSuccessHook(taskId, hook) {
    this.#getManager().registerTaskSuccessHook(taskId, hook);
  }
  getTaskSuccessHook(taskId) {
    return this.#getManager().getTaskSuccessHook(taskId);
  }
  getGlobalSuccessHooks() {
    return this.#getManager().getGlobalSuccessHooks();
  }
  registerGlobalCompleteHook(hook) {
    this.#getManager().registerGlobalCompleteHook(hook);
  }
  registerTaskCompleteHook(taskId, hook) {
    this.#getManager().registerTaskCompleteHook(taskId, hook);
  }
  getTaskCompleteHook(taskId) {
    return this.#getManager().getTaskCompleteHook(taskId);
  }
  getGlobalCompleteHooks() {
    return this.#getManager().getGlobalCompleteHooks();
  }
  registerGlobalWaitHook(hook) {
    this.#getManager().registerGlobalWaitHook(hook);
  }
  registerTaskWaitHook(taskId, hook) {
    this.#getManager().registerTaskWaitHook(taskId, hook);
  }
  getTaskWaitHook(taskId) {
    return this.#getManager().getTaskWaitHook(taskId);
  }
  getGlobalWaitHooks() {
    return this.#getManager().getGlobalWaitHooks();
  }
  registerGlobalResumeHook(hook) {
    this.#getManager().registerGlobalResumeHook(hook);
  }
  registerTaskResumeHook(taskId, hook) {
    this.#getManager().registerTaskResumeHook(taskId, hook);
  }
  getTaskResumeHook(taskId) {
    return this.#getManager().getTaskResumeHook(taskId);
  }
  getGlobalResumeHooks() {
    return this.#getManager().getGlobalResumeHooks();
  }
  registerGlobalCatchErrorHook(hook) {
    this.#getManager().registerGlobalCatchErrorHook(hook);
  }
  registerTaskCatchErrorHook(taskId, hook) {
    this.#getManager().registerTaskCatchErrorHook(taskId, hook);
  }
  getTaskCatchErrorHook(taskId) {
    return this.#getManager().getTaskCatchErrorHook(taskId);
  }
  getGlobalCatchErrorHooks() {
    return this.#getManager().getGlobalCatchErrorHooks();
  }
  registerGlobalMiddlewareHook(hook) {
    this.#getManager().registerGlobalMiddlewareHook(hook);
  }
  registerTaskMiddlewareHook(taskId, hook) {
    this.#getManager().registerTaskMiddlewareHook(taskId, hook);
  }
  getTaskMiddlewareHook(taskId) {
    return this.#getManager().getTaskMiddlewareHook(taskId);
  }
  getGlobalMiddlewareHooks() {
    return this.#getManager().getGlobalMiddlewareHooks();
  }
  registerGlobalCleanupHook(hook) {
    this.#getManager().registerGlobalCleanupHook(hook);
  }
  registerTaskCleanupHook(taskId, hook) {
    this.#getManager().registerTaskCleanupHook(taskId, hook);
  }
  getTaskCleanupHook(taskId) {
    return this.#getManager().getTaskCleanupHook(taskId);
  }
  getGlobalCleanupHooks() {
    return this.#getManager().getGlobalCleanupHooks();
  }
  callOnWaitHookListeners(wait2) {
    return this.#getManager().callOnWaitHookListeners(wait2);
  }
  callOnResumeHookListeners(wait2) {
    return this.#getManager().callOnResumeHookListeners(wait2);
  }
  registerOnWaitHookListener(listener) {
    this.#getManager().registerOnWaitHookListener(listener);
  }
  registerOnResumeHookListener(listener) {
    this.#getManager().registerOnResumeHookListener(listener);
  }
  registerGlobalCancelHook(hook) {
    this.#getManager().registerGlobalCancelHook(hook);
  }
  registerTaskCancelHook(taskId, hook) {
    this.#getManager().registerTaskCancelHook(taskId, hook);
  }
  getTaskCancelHook(taskId) {
    return this.#getManager().getTaskCancelHook(taskId);
  }
  getGlobalCancelHooks() {
    return this.#getManager().getGlobalCancelHooks();
  }
  callOnCancelHookListeners() {
    return this.#getManager().callOnCancelHookListeners();
  }
  registerOnCancelHookListener(listener) {
    this.#getManager().registerOnCancelHookListener(listener);
  }
  #getManager() {
    return getGlobal(API_NAME16) ?? NOOP_LIFECYCLE_HOOKS_MANAGER;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/lifecycle-hooks-api.js
var lifecycleHooks = LifecycleHooksAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/locals/manager.js
var NoopLocalsManager = class {
  createLocal(id) {
    return {
      __type: /* @__PURE__ */ Symbol(),
      id
    };
  }
  getLocal(key) {
    return void 0;
  }
  setLocal(key, value) {
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/locals/index.js
var API_NAME17 = "locals";
var NOOP_LOCALS_MANAGER = new NoopLocalsManager();
var LocalsAPI = class _LocalsAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _LocalsAPI();
    }
    return this._instance;
  }
  setGlobalLocalsManager(localsManager) {
    return registerGlobal(API_NAME17, localsManager);
  }
  disable() {
    unregisterGlobal(API_NAME17);
  }
  createLocal(id) {
    return this.#getManager().createLocal(id);
  }
  getLocal(key) {
    return this.#getManager().getLocal(key);
  }
  setLocal(key, value) {
    return this.#getManager().setLocal(key, value);
  }
  #getManager() {
    return getGlobal(API_NAME17) ?? NOOP_LOCALS_MANAGER;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/locals-api.js
var localsAPI = LocalsAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/heartbeats/api.js
var API_NAME18 = "heartbeats";
var NoopHeartbeatsManager = class {
  startHeartbeat(id) {
    return;
  }
  stopHeartbeat() {
    return;
  }
  async yield() {
    return;
  }
  get lastHeartbeat() {
    return void 0;
  }
  reset() {
  }
};
var NOOP_HEARTBEATS_MANAGER = new NoopHeartbeatsManager();
var HeartbeatsAPI = class _HeartbeatsAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _HeartbeatsAPI();
    }
    return this._instance;
  }
  setGlobalManager(manager) {
    return registerGlobal(API_NAME18, manager);
  }
  disable() {
    unregisterGlobal(API_NAME18);
  }
  reset() {
    this.#getManager().reset();
    this.disable();
  }
  get lastHeartbeat() {
    return this.#getManager().lastHeartbeat;
  }
  startHeartbeat(id) {
    return this.#getManager().startHeartbeat(id);
  }
  stopHeartbeat() {
    return this.#getManager().stopHeartbeat();
  }
  yield() {
    return this.#getManager().yield();
  }
  #getManager() {
    return getGlobal(API_NAME18) ?? NOOP_HEARTBEATS_MANAGER;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/heartbeats-api.js
var heartbeats = HeartbeatsAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/realtimeStreams/noopManager.js
var NoopRealtimeStreamsManager = class {
  pipe(key, source, options) {
    return {
      wait: () => Promise.resolve(),
      get stream() {
        return createAsyncIterableStreamFromAsyncIterable(source);
      }
    };
  }
  async append(key, part, options) {
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/realtimeStreams/index.js
var API_NAME19 = "realtime-streams";
var NOOP_MANAGER4 = new NoopRealtimeStreamsManager();
var RealtimeStreamsAPI = class _RealtimeStreamsAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _RealtimeStreamsAPI();
    }
    return this._instance;
  }
  setGlobalManager(manager) {
    return registerGlobal(API_NAME19, manager);
  }
  #getManager() {
    return getGlobal(API_NAME19) ?? NOOP_MANAGER4;
  }
  pipe(key, source, options) {
    return this.#getManager().pipe(key, source, options);
  }
  append(key, part, options) {
    return this.#getManager().append(key, part, options);
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/realtime-streams-api.js
var realtimeStreams = RealtimeStreamsAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/resource-catalog/noopResourceCatalog.js
var NoopResourceCatalog = class {
  registerTaskMetadata(task) {
  }
  setCurrentFileContext(filePath, entryPoint) {
  }
  clearCurrentFileContext() {
  }
  updateTaskMetadata(id, updates) {
  }
  listTaskManifests() {
    return [];
  }
  getTaskManifest(id) {
    return void 0;
  }
  getTask(id) {
    return void 0;
  }
  getTaskSchema(id) {
    return void 0;
  }
  taskExists(id) {
    return false;
  }
  disable() {
  }
  registerWorkerManifest(workerManifest) {
  }
  registerQueueMetadata(queue2) {
  }
  listQueueManifests() {
    return [];
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/resource-catalog/index.js
var API_NAME20 = "resource-catalog";
var NOOP_RESOURCE_CATALOG = new NoopResourceCatalog();
var ResourceCatalogAPI = class _ResourceCatalogAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _ResourceCatalogAPI();
    }
    return this._instance;
  }
  setGlobalResourceCatalog(resourceCatalog2) {
    return registerGlobal(API_NAME20, resourceCatalog2);
  }
  disable() {
    unregisterGlobal(API_NAME20);
  }
  registerQueueMetadata(queue2) {
    this.#getCatalog().registerQueueMetadata(queue2);
  }
  registerTaskMetadata(task) {
    this.#getCatalog().registerTaskMetadata(task);
  }
  updateTaskMetadata(id, updates) {
    this.#getCatalog().updateTaskMetadata(id, updates);
  }
  setCurrentFileContext(filePath, entryPoint) {
    this.#getCatalog().setCurrentFileContext(filePath, entryPoint);
  }
  clearCurrentFileContext() {
    this.#getCatalog().clearCurrentFileContext();
  }
  registerWorkerManifest(workerManifest) {
    this.#getCatalog().registerWorkerManifest(workerManifest);
  }
  listTaskManifests() {
    return this.#getCatalog().listTaskManifests();
  }
  getTaskManifest(id) {
    return this.#getCatalog().getTaskManifest(id);
  }
  getTask(id) {
    return this.#getCatalog().getTask(id);
  }
  getTaskSchema(id) {
    return this.#getCatalog().getTaskSchema(id);
  }
  taskExists(id) {
    return this.#getCatalog().taskExists(id);
  }
  listQueueManifests() {
    return this.#getCatalog().listQueueManifests();
  }
  #getCatalog() {
    return getGlobal(API_NAME20) ?? NOOP_RESOURCE_CATALOG;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/resource-catalog-api.js
var resourceCatalog = ResourceCatalogAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/types/tasks.js
var SubtaskUnwrapError = class extends Error {
  taskId;
  runId;
  cause;
  constructor(taskId, runId, subtaskError) {
    if (subtaskError instanceof Error) {
      super(`Error in ${taskId}: ${subtaskError.message}`);
      this.cause = subtaskError;
      this.name = "SubtaskUnwrapError";
    } else {
      super(`Error in ${taskId}`);
      this.name = "SubtaskUnwrapError";
      this.cause = subtaskError;
    }
    this.taskId = taskId;
    this.runId = runId;
  }
};
var TaskRunPromise = class extends Promise {
  taskId;
  constructor(executor, taskId) {
    super(executor);
    this.taskId = taskId;
  }
  unwrap() {
    return this.then((result) => {
      if (result.ok) {
        return result.output;
      } else {
        throw new SubtaskUnwrapError(this.taskId, result.id, result.error);
      }
    });
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/idempotency-key-catalog/lruIdempotencyKeyCatalog.js
var LRUIdempotencyKeyCatalog = class {
  cache;
  maxSize;
  constructor(maxSize = 1e3) {
    this.cache = /* @__PURE__ */ new Map();
    this.maxSize = Math.max(0, maxSize);
  }
  registerKeyOptions(hash, options) {
    this.cache.delete(hash);
    this.cache.set(hash, options);
    while (this.cache.size > this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== void 0) {
        this.cache.delete(oldest);
      }
    }
  }
  getKeyOptions(hash) {
    const options = this.cache.get(hash);
    if (options) {
      this.cache.delete(hash);
      this.cache.set(hash, options);
    }
    return options;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/idempotency-key-catalog/index.js
var API_NAME21 = "idempotency-key-catalog";
var IdempotencyKeyCatalogAPI = class _IdempotencyKeyCatalogAPI {
  static _instance;
  constructor() {
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new _IdempotencyKeyCatalogAPI();
    }
    return this._instance;
  }
  registerKeyOptions(hash, options) {
    this.#getCatalog().registerKeyOptions(hash, options);
  }
  getKeyOptions(hash) {
    return this.#getCatalog().getKeyOptions(hash);
  }
  #getCatalog() {
    let catalog = getGlobal(API_NAME21);
    if (!catalog) {
      catalog = new LRUIdempotencyKeyCatalog();
      registerGlobal(API_NAME21, catalog, true);
    }
    return catalog;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/idempotency-key-catalog-api.js
var idempotencyKeyCatalog = IdempotencyKeyCatalogAPI.getInstance();

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/idempotencyKeys.js
function getIdempotencyKeyOptions(idempotencyKey) {
  if (typeof idempotencyKey === "string") {
    return idempotencyKeyCatalog.getKeyOptions(idempotencyKey);
  }
  return void 0;
}
function isIdempotencyKey(value) {
  if (typeof value === "string") {
    return value.length === 64;
  }
  return false;
}
function flattenIdempotencyKey(idempotencyKey) {
  if (!idempotencyKey) {
    return;
  }
  if (Array.isArray(idempotencyKey)) {
    if (idempotencyKey.some((i2) => i2 === void 0)) {
      return;
    }
    return idempotencyKey.flatMap((key) => {
      const k = flattenIdempotencyKey(key);
      if (!k)
        return [];
      return [k];
    });
  }
  return idempotencyKey;
}
async function makeIdempotencyKey(idempotencyKey) {
  if (!idempotencyKey) {
    return;
  }
  if (isIdempotencyKey(idempotencyKey)) {
    return idempotencyKey;
  }
  return await createIdempotencyKey(idempotencyKey, {
    scope: "run"
  });
}
async function createIdempotencyKey(key, options) {
  const scope = options?.scope ?? "run";
  const keyArray = Array.isArray(key) ? key : [key];
  const userKey = keyArray.join("-");
  const idempotencyKey = await generateIdempotencyKey(keyArray.concat(injectScope(scope)));
  idempotencyKeyCatalog.registerKeyOptions(idempotencyKey, { key: userKey, scope });
  return idempotencyKey;
}
function injectScope(scope) {
  switch (scope) {
    case "run": {
      if (taskContext?.ctx) {
        return [taskContext.ctx.run.id];
      }
      break;
    }
    case "attempt": {
      if (taskContext?.ctx) {
        return [taskContext.ctx.run.id, taskContext.ctx.attempt.number.toString()];
      }
      break;
    }
  }
  return [];
}
async function generateIdempotencyKey(keyMaterial) {
  return await digestSHA256(keyMaterial.join("-"));
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/utils/durations.js
var import_humanize_duration = __toESM(require_humanize_duration(), 1);

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/otel/utils.js
function recordSpanException(span, error) {
  if (error instanceof Error) {
    span.recordException(sanitizeSpanError(error));
  } else if (typeof error === "string") {
    span.recordException(error.replace(/\0/g, ""));
  } else {
    span.recordException(JSON.stringify(error).replace(/\0/g, ""));
  }
  span.setStatus({ code: SpanStatusCode.ERROR });
}
function sanitizeSpanError(error) {
  const sanitizedError = new Error(error.message.replace(/\0/g, ""));
  sanitizedError.name = error.name.replace(/\0/g, "");
  sanitizedError.stack = error.stack?.replace(/\0/g, "");
  return sanitizedError;
}

// ../../node_modules/.pnpm/@trigger.dev+core@4.3.3_bufferutil@4.1.0_supports-color@10.2.2_typescript@5.9.3/node_modules/@trigger.dev/core/dist/esm/v3/tracer.js
var TriggerTracer = class {
  _config;
  constructor(_config) {
    this._config = _config;
  }
  _tracer;
  get tracer() {
    if (!this._tracer) {
      if ("tracer" in this._config)
        return this._config.tracer;
      this._tracer = trace.getTracer(this._config.name, this._config.version);
    }
    return this._tracer;
  }
  _logger;
  get logger() {
    if (!this._logger) {
      if ("logger" in this._config)
        return this._config.logger;
      this._logger = logs.getLogger(this._config.name, this._config.version);
    }
    return this._logger;
  }
  startActiveSpan(name2, fn, options, ctx, signal) {
    const parentContext = ctx ?? context.active();
    const attributes = options?.attributes ?? {};
    let spanEnded = false;
    const createPartialSpanWithEvents = options?.events && options.events.length > 0;
    return this.tracer.startActiveSpan(name2, {
      ...options,
      attributes: {
        ...attributes,
        ...createPartialSpanWithEvents ? {
          [SemanticInternalAttributes.SKIP_SPAN_PARTIAL]: true
        } : {}
      },
      startTime: clock.preciseNow()
    }, parentContext, async (span) => {
      signal?.addEventListener("abort", () => {
        if (!spanEnded) {
          spanEnded = true;
          recordSpanException(span, signal.reason);
          span.end();
        }
      });
      if (taskContext.ctx && createPartialSpanWithEvents) {
        const partialSpan = this.tracer.startSpan(name2, {
          ...options,
          attributes: {
            ...attributes,
            [SemanticInternalAttributes.SPAN_PARTIAL]: true,
            [SemanticInternalAttributes.SPAN_ID]: span.spanContext().spanId
          }
        }, parentContext);
        if (options?.events) {
          for (const event of options.events) {
            partialSpan.addEvent(event.name, event.attributes, event.startTime);
          }
        }
        partialSpan.end();
      }
      if (options?.events) {
        for (const event of options.events) {
          span.addEvent(event.name, event.attributes, event.startTime);
        }
      }
      const usageMeasurement = usage.start();
      try {
        return await fn(span);
      } catch (e) {
        if (isCompleteTaskWithOutput(e)) {
          if (!spanEnded) {
            span.end(clock.preciseNow());
          }
          throw e;
        }
        if (!spanEnded) {
          if (typeof e === "string" || e instanceof Error) {
            span.recordException(e);
          }
          span.setStatus({ code: SpanStatusCode.ERROR });
        }
        throw e;
      } finally {
        if (!spanEnded) {
          spanEnded = true;
          if (taskContext.ctx) {
            const usageSample = usage.stop(usageMeasurement);
            const machine = taskContext.ctx.machine;
            span.setAttributes({
              [SemanticInternalAttributes.USAGE_DURATION_MS]: usageSample.cpuTime,
              [SemanticInternalAttributes.USAGE_COST_IN_CENTS]: machine?.centsPerMs ? usageSample.cpuTime * machine.centsPerMs : 0
            });
          }
          span.end(clock.preciseNow());
        }
      }
    });
  }
  startSpan(name2, options, ctx) {
    const parentContext = ctx ?? context.active();
    const attributes = options?.attributes ?? {};
    const span = this.tracer.startSpan(name2, options, parentContext);
    return span;
  }
};

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.3.3_bufferutil@4.1.0_typescript@5.9.3_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/version.js
var VERSION3 = "4.3.3";

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.3.3_bufferutil@4.1.0_typescript@5.9.3_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/tracer.js
var tracer = new TriggerTracer({ name: "@trigger.dev/sdk", version: VERSION3 });

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.3.3_bufferutil@4.1.0_typescript@5.9.3_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/shared.js
async function trigger(id, payload, options, requestOptions) {
  return await trigger_internal("tasks.trigger()", id, payload, void 0, options, requestOptions);
}
function triggerAndWait(id, payload, options, requestOptions) {
  return new TaskRunPromise((resolve, reject) => {
    triggerAndWait_internal("tasks.triggerAndWait()", id, payload, void 0, options, requestOptions).then((result) => {
      resolve(result);
    }).catch((error) => {
      reject(error);
    });
  }, id);
}
async function batchTriggerAndWait(id, items, options, requestOptions) {
  return await batchTriggerAndWait_internal("tasks.batchTriggerAndWait()", id, items, void 0, options, requestOptions);
}
async function batchTrigger(id, items, options, requestOptions) {
  return await batchTrigger_internal("tasks.batchTrigger()", id, items, options, void 0, requestOptions);
}
async function executeBatchTwoPhase(apiClient, items, options, requestOptions) {
  let batch;
  try {
    batch = await apiClient.createBatch({
      runCount: items.length,
      parentRunId: options.parentRunId,
      resumeParentOnCompletion: options.resumeParentOnCompletion,
      idempotencyKey: options.idempotencyKey,
      idempotencyKeyOptions: options.idempotencyKeyOptions
    }, { spanParentAsLink: options.spanParentAsLink }, requestOptions);
  } catch (error) {
    throw new BatchTriggerError(`Failed to create batch with ${items.length} items`, {
      cause: error,
      phase: "create",
      itemCount: items.length
    });
  }
  if (!batch.isCached) {
    try {
      await apiClient.streamBatchItems(batch.id, items, requestOptions);
    } catch (error) {
      throw new BatchTriggerError(`Failed to stream items for batch ${batch.id} (${items.length} items)`, { cause: error, phase: "stream", batchId: batch.id, itemCount: items.length });
    }
  }
  return {
    id: batch.id,
    runCount: batch.runCount,
    publicAccessToken: batch.publicAccessToken
  };
}
var BatchTriggerError = class extends Error {
  phase;
  batchId;
  itemCount;
  /** True if the error was caused by rate limiting (HTTP 429) */
  isRateLimited;
  /** Milliseconds until the rate limit resets. Only set when `isRateLimited` is true. */
  retryAfterMs;
  /** The underlying API error, if the cause was an ApiError */
  apiError;
  /** The underlying cause of the error */
  cause;
  constructor(message, options) {
    const fullMessage = buildBatchErrorMessage(message, options.cause);
    super(fullMessage, { cause: options.cause });
    this.name = "BatchTriggerError";
    this.cause = options.cause;
    this.phase = options.phase;
    this.batchId = options.batchId;
    this.itemCount = options.itemCount;
    if (options.cause instanceof RateLimitError) {
      this.isRateLimited = true;
      this.retryAfterMs = options.cause.millisecondsUntilReset;
      this.apiError = options.cause;
    } else if (options.cause instanceof ApiError) {
      this.isRateLimited = options.cause.status === 429;
      this.apiError = options.cause;
    } else {
      this.isRateLimited = false;
    }
  }
};
function buildBatchErrorMessage(baseMessage, cause) {
  if (!cause) {
    return baseMessage;
  }
  if (cause instanceof RateLimitError) {
    const retryMs = cause.millisecondsUntilReset;
    if (retryMs !== void 0) {
      const retrySeconds = Math.ceil(retryMs / 1e3);
      return `${baseMessage}: Rate limit exceeded - retry after ${retrySeconds}s`;
    }
    return `${baseMessage}: Rate limit exceeded`;
  }
  if (cause instanceof ApiError) {
    return `${baseMessage}: ${cause.message}`;
  }
  if (cause instanceof Error) {
    return `${baseMessage}: ${cause.message}`;
  }
  return baseMessage;
}
async function executeBatchTwoPhaseStreaming(apiClient, items, options, requestOptions) {
  const itemsArray = [];
  for await (const item of items) {
    itemsArray.push(item);
  }
  return executeBatchTwoPhase(apiClient, itemsArray, options, requestOptions);
}
function isReadableStream(value) {
  return value != null && typeof value === "object" && "getReader" in value && typeof value.getReader === "function";
}
async function* readableStreamToAsyncIterable(stream2) {
  const reader = stream2.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done)
        break;
      yield value;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
    }
    reader.releaseLock();
  }
}
function normalizeToAsyncIterable(input) {
  if (isReadableStream(input)) {
    return readableStreamToAsyncIterable(input);
  }
  return input;
}
async function* transformSingleTaskBatchItemsStream(taskIdentifier, items, parsePayload, options, queue2) {
  let index = 0;
  for await (const item of items) {
    const parsedPayload = parsePayload ? await parsePayload(item.payload) : item.payload;
    const payloadPacket = await stringifyIO(parsedPayload);
    const batchItemIdempotencyKey = await makeIdempotencyKey(flattenIdempotencyKey([options?.idempotencyKey, `${index}`]));
    yield {
      index: index++,
      task: taskIdentifier,
      payload: payloadPacket.data,
      options: {
        queue: item.options?.queue ? { name: item.options.queue } : queue2 ? { name: queue2 } : void 0,
        concurrencyKey: item.options?.concurrencyKey,
        test: taskContext.ctx?.run.isTest,
        payloadType: payloadPacket.dataType,
        delay: item.options?.delay,
        ttl: item.options?.ttl,
        tags: item.options?.tags,
        maxAttempts: item.options?.maxAttempts,
        metadata: item.options?.metadata,
        maxDuration: item.options?.maxDuration,
        idempotencyKey: await makeIdempotencyKey(item.options?.idempotencyKey) ?? batchItemIdempotencyKey,
        idempotencyKeyTTL: item.options?.idempotencyKeyTTL ?? options?.idempotencyKeyTTL,
        machine: item.options?.machine,
        priority: item.options?.priority,
        region: item.options?.region,
        lockToVersion: item.options?.version ?? getEnvVar("TRIGGER_VERSION"),
        debounce: item.options?.debounce
      }
    };
  }
}
async function* transformSingleTaskBatchItemsStreamForWait(taskIdentifier, items, parsePayload, options, queue2) {
  let index = 0;
  for await (const item of items) {
    const parsedPayload = parsePayload ? await parsePayload(item.payload) : item.payload;
    const payloadPacket = await stringifyIO(parsedPayload);
    const batchItemIdempotencyKey = await makeIdempotencyKey(flattenIdempotencyKey([options?.idempotencyKey, `${index}`]));
    const itemIdempotencyKey = await makeIdempotencyKey(item.options?.idempotencyKey);
    const finalIdempotencyKey = itemIdempotencyKey ?? batchItemIdempotencyKey;
    const idempotencyKeyOptions = itemIdempotencyKey ? getIdempotencyKeyOptions(itemIdempotencyKey) : void 0;
    yield {
      index: index++,
      task: taskIdentifier,
      payload: payloadPacket.data,
      options: {
        lockToVersion: taskContext.worker?.version,
        queue: item.options?.queue ? { name: item.options.queue } : queue2 ? { name: queue2 } : void 0,
        concurrencyKey: item.options?.concurrencyKey,
        test: taskContext.ctx?.run.isTest,
        payloadType: payloadPacket.dataType,
        delay: item.options?.delay,
        ttl: item.options?.ttl,
        tags: item.options?.tags,
        maxAttempts: item.options?.maxAttempts,
        metadata: item.options?.metadata,
        maxDuration: item.options?.maxDuration,
        idempotencyKey: finalIdempotencyKey?.toString(),
        idempotencyKeyTTL: item.options?.idempotencyKeyTTL ?? options?.idempotencyKeyTTL,
        idempotencyKeyOptions,
        machine: item.options?.machine,
        priority: item.options?.priority,
        region: item.options?.region,
        debounce: item.options?.debounce
      }
    };
  }
}
async function trigger_internal(name2, id, payload, parsePayload, options, requestOptions) {
  const apiClient = apiClientManager.clientOrThrow(requestOptions?.clientConfig);
  const parsedPayload = parsePayload ? await parsePayload(payload) : payload;
  const payloadPacket = await stringifyIO(parsedPayload);
  const processedIdempotencyKey = await makeIdempotencyKey(options?.idempotencyKey);
  const idempotencyKeyOptions = processedIdempotencyKey ? getIdempotencyKeyOptions(processedIdempotencyKey) : void 0;
  const handle = await apiClient.triggerTask(id, {
    payload: payloadPacket.data,
    options: {
      queue: options?.queue ? { name: options.queue } : void 0,
      concurrencyKey: options?.concurrencyKey,
      test: taskContext.ctx?.run.isTest,
      payloadType: payloadPacket.dataType,
      idempotencyKey: processedIdempotencyKey?.toString(),
      idempotencyKeyTTL: options?.idempotencyKeyTTL,
      idempotencyKeyOptions,
      delay: options?.delay,
      ttl: options?.ttl,
      tags: options?.tags,
      maxAttempts: options?.maxAttempts,
      metadata: options?.metadata,
      maxDuration: options?.maxDuration,
      parentRunId: taskContext.ctx?.run.id,
      machine: options?.machine,
      priority: options?.priority,
      region: options?.region,
      lockToVersion: options?.version ?? getEnvVar("TRIGGER_VERSION"),
      debounce: options?.debounce
    }
  }, {
    spanParentAsLink: true
  }, {
    name: name2,
    tracer,
    icon: "trigger",
    onResponseBody: (body, span) => {
      if (body && typeof body === "object" && !Array.isArray(body)) {
        if ("id" in body && typeof body.id === "string") {
          span.setAttribute("runId", body.id);
        }
      }
    },
    ...requestOptions
  });
  return handle;
}
async function batchTrigger_internal(name2, taskIdentifier, items, options, parsePayload, requestOptions, queue2) {
  const apiClient = apiClientManager.clientOrThrow(requestOptions?.clientConfig);
  const ctx = taskContext.ctx;
  if (Array.isArray(items)) {
    const ndJsonItems = await Promise.all(items.map(async (item, index) => {
      const parsedPayload = parsePayload ? await parsePayload(item.payload) : item.payload;
      const payloadPacket = await stringifyIO(parsedPayload);
      const batchItemIdempotencyKey = await makeIdempotencyKey(flattenIdempotencyKey([options?.idempotencyKey, `${index}`]));
      const itemIdempotencyKey = await makeIdempotencyKey(item.options?.idempotencyKey);
      const finalIdempotencyKey = itemIdempotencyKey ?? batchItemIdempotencyKey;
      const idempotencyKeyOptions = itemIdempotencyKey ? getIdempotencyKeyOptions(itemIdempotencyKey) : void 0;
      return {
        index,
        task: taskIdentifier,
        payload: payloadPacket.data,
        options: {
          queue: item.options?.queue ? { name: item.options.queue } : queue2 ? { name: queue2 } : void 0,
          concurrencyKey: item.options?.concurrencyKey,
          test: taskContext.ctx?.run.isTest,
          payloadType: payloadPacket.dataType,
          delay: item.options?.delay,
          ttl: item.options?.ttl,
          tags: item.options?.tags,
          maxAttempts: item.options?.maxAttempts,
          metadata: item.options?.metadata,
          maxDuration: item.options?.maxDuration,
          idempotencyKey: finalIdempotencyKey?.toString(),
          idempotencyKeyTTL: item.options?.idempotencyKeyTTL ?? options?.idempotencyKeyTTL,
          idempotencyKeyOptions,
          machine: item.options?.machine,
          priority: item.options?.priority,
          region: item.options?.region,
          lockToVersion: item.options?.version ?? getEnvVar("TRIGGER_VERSION")
        }
      };
    }));
    const batchIdempotencyKey = await makeIdempotencyKey(options?.idempotencyKey);
    const batchIdempotencyKeyOptions = batchIdempotencyKey ? getIdempotencyKeyOptions(batchIdempotencyKey) : void 0;
    const response = await tracer.startActiveSpan(name2, async (span) => {
      const result = await executeBatchTwoPhase(apiClient, ndJsonItems, {
        parentRunId: ctx?.run.id,
        idempotencyKey: batchIdempotencyKey?.toString(),
        idempotencyKeyOptions: batchIdempotencyKeyOptions,
        spanParentAsLink: true
        // Fire-and-forget: child runs get separate trace IDs
      }, requestOptions);
      span.setAttribute("batchId", result.id);
      span.setAttribute("runCount", result.runCount);
      return result;
    }, {
      kind: SpanKind.PRODUCER,
      attributes: {
        [SemanticInternalAttributes.STYLE_ICON]: "trigger",
        ...accessoryAttributes({
          items: [
            {
              text: taskIdentifier,
              variant: "normal"
            }
          ],
          style: "codepath"
        })
      }
    });
    const handle = {
      batchId: response.id,
      runCount: response.runCount,
      publicAccessToken: response.publicAccessToken
    };
    return handle;
  } else {
    const asyncItems = normalizeToAsyncIterable(items);
    const transformedItems = transformSingleTaskBatchItemsStream(taskIdentifier, asyncItems, parsePayload, options, queue2);
    const streamBatchIdempotencyKey = await makeIdempotencyKey(options?.idempotencyKey);
    const streamBatchIdempotencyKeyOptions = streamBatchIdempotencyKey ? getIdempotencyKeyOptions(streamBatchIdempotencyKey) : void 0;
    const response = await tracer.startActiveSpan(name2, async (span) => {
      const result = await executeBatchTwoPhaseStreaming(apiClient, transformedItems, {
        parentRunId: ctx?.run.id,
        idempotencyKey: streamBatchIdempotencyKey?.toString(),
        idempotencyKeyOptions: streamBatchIdempotencyKeyOptions,
        spanParentAsLink: true
        // Fire-and-forget: child runs get separate trace IDs
      }, requestOptions);
      span.setAttribute("batchId", result.id);
      span.setAttribute("runCount", result.runCount);
      return result;
    }, {
      kind: SpanKind.PRODUCER,
      attributes: {
        [SemanticInternalAttributes.STYLE_ICON]: "trigger",
        ...accessoryAttributes({
          items: [
            {
              text: taskIdentifier,
              variant: "normal"
            }
          ],
          style: "codepath"
        })
      }
    });
    const handle = {
      batchId: response.id,
      runCount: response.runCount,
      publicAccessToken: response.publicAccessToken
    };
    return handle;
  }
}
async function triggerAndWait_internal(name2, id, payload, parsePayload, options, requestOptions) {
  const ctx = taskContext.ctx;
  if (!ctx) {
    throw new Error("triggerAndWait can only be used from inside a task.run()");
  }
  const apiClient = apiClientManager.clientOrThrow(requestOptions?.clientConfig);
  const parsedPayload = parsePayload ? await parsePayload(payload) : payload;
  const payloadPacket = await stringifyIO(parsedPayload);
  const processedIdempotencyKey = await makeIdempotencyKey(options?.idempotencyKey);
  const idempotencyKeyOptions = processedIdempotencyKey ? getIdempotencyKeyOptions(processedIdempotencyKey) : void 0;
  return await tracer.startActiveSpan(name2, async (span) => {
    const response = await apiClient.triggerTask(id, {
      payload: payloadPacket.data,
      options: {
        lockToVersion: taskContext.worker?.version,
        // Lock to current version because we're waiting for it to finish
        queue: options?.queue ? { name: options.queue } : void 0,
        concurrencyKey: options?.concurrencyKey,
        test: taskContext.ctx?.run.isTest,
        payloadType: payloadPacket.dataType,
        delay: options?.delay,
        ttl: options?.ttl,
        tags: options?.tags,
        maxAttempts: options?.maxAttempts,
        metadata: options?.metadata,
        maxDuration: options?.maxDuration,
        resumeParentOnCompletion: true,
        parentRunId: ctx.run.id,
        idempotencyKey: processedIdempotencyKey?.toString(),
        idempotencyKeyTTL: options?.idempotencyKeyTTL,
        idempotencyKeyOptions,
        machine: options?.machine,
        priority: options?.priority,
        region: options?.region,
        debounce: options?.debounce
      }
    }, {}, requestOptions);
    span.setAttribute("runId", response.id);
    const result = await runtime.waitForTask({
      id: response.id,
      ctx
    });
    return await handleTaskRunExecutionResult(result, id);
  }, {
    kind: SpanKind.PRODUCER,
    attributes: {
      [SemanticInternalAttributes.STYLE_ICON]: "trigger",
      ...accessoryAttributes({
        items: [
          {
            text: id,
            variant: "normal"
          }
        ],
        style: "codepath"
      })
    }
  });
}
async function batchTriggerAndWait_internal(name2, id, items, parsePayload, options, requestOptions, queue2) {
  const ctx = taskContext.ctx;
  if (!ctx) {
    throw new Error("batchTriggerAndWait can only be used from inside a task.run()");
  }
  const apiClient = apiClientManager.clientOrThrow(requestOptions?.clientConfig);
  if (Array.isArray(items)) {
    const ndJsonItems = await Promise.all(items.map(async (item, index) => {
      const parsedPayload = parsePayload ? await parsePayload(item.payload) : item.payload;
      const payloadPacket = await stringifyIO(parsedPayload);
      const batchItemIdempotencyKey = await makeIdempotencyKey(flattenIdempotencyKey([options?.idempotencyKey, `${index}`]));
      const itemIdempotencyKey = await makeIdempotencyKey(item.options?.idempotencyKey);
      const finalIdempotencyKey = itemIdempotencyKey ?? batchItemIdempotencyKey;
      const idempotencyKeyOptions = itemIdempotencyKey ? getIdempotencyKeyOptions(itemIdempotencyKey) : void 0;
      return {
        index,
        task: id,
        payload: payloadPacket.data,
        options: {
          lockToVersion: taskContext.worker?.version,
          queue: item.options?.queue ? { name: item.options.queue } : queue2 ? { name: queue2 } : void 0,
          concurrencyKey: item.options?.concurrencyKey,
          test: taskContext.ctx?.run.isTest,
          payloadType: payloadPacket.dataType,
          delay: item.options?.delay,
          ttl: item.options?.ttl,
          tags: item.options?.tags,
          maxAttempts: item.options?.maxAttempts,
          metadata: item.options?.metadata,
          maxDuration: item.options?.maxDuration,
          idempotencyKey: finalIdempotencyKey?.toString(),
          idempotencyKeyTTL: item.options?.idempotencyKeyTTL ?? options?.idempotencyKeyTTL,
          idempotencyKeyOptions,
          machine: item.options?.machine,
          priority: item.options?.priority,
          region: item.options?.region
        }
      };
    }));
    const batchIdempotencyKey = await makeIdempotencyKey(options?.idempotencyKey);
    const batchIdempotencyKeyOptions = batchIdempotencyKey ? getIdempotencyKeyOptions(batchIdempotencyKey) : void 0;
    return await tracer.startActiveSpan(name2, async (span) => {
      const response = await executeBatchTwoPhase(apiClient, ndJsonItems, {
        parentRunId: ctx.run.id,
        resumeParentOnCompletion: true,
        idempotencyKey: batchIdempotencyKey?.toString(),
        idempotencyKeyOptions: batchIdempotencyKeyOptions,
        spanParentAsLink: false
        // Waiting: child runs share parent's trace ID
      }, requestOptions);
      span.setAttribute("batchId", response.id);
      span.setAttribute("runCount", response.runCount);
      const result = await runtime.waitForBatch({
        id: response.id,
        runCount: response.runCount,
        ctx
      });
      const runs2 = await handleBatchTaskRunExecutionResult(result.items, id);
      return {
        id: result.id,
        runs: runs2
      };
    }, {
      kind: SpanKind.PRODUCER,
      attributes: {
        [SemanticInternalAttributes.STYLE_ICON]: "trigger",
        ...accessoryAttributes({
          items: [
            {
              text: id,
              variant: "normal"
            }
          ],
          style: "codepath"
        })
      }
    });
  } else {
    const asyncItems = normalizeToAsyncIterable(items);
    const transformedItems = transformSingleTaskBatchItemsStreamForWait(id, asyncItems, parsePayload, options, queue2);
    const streamBatchIdempotencyKey = await makeIdempotencyKey(options?.idempotencyKey);
    const streamBatchIdempotencyKeyOptions = streamBatchIdempotencyKey ? getIdempotencyKeyOptions(streamBatchIdempotencyKey) : void 0;
    return await tracer.startActiveSpan(name2, async (span) => {
      const response = await executeBatchTwoPhaseStreaming(apiClient, transformedItems, {
        parentRunId: ctx.run.id,
        resumeParentOnCompletion: true,
        idempotencyKey: streamBatchIdempotencyKey?.toString(),
        idempotencyKeyOptions: streamBatchIdempotencyKeyOptions,
        spanParentAsLink: false
        // Waiting: child runs share parent's trace ID
      }, requestOptions);
      span.setAttribute("batchId", response.id);
      span.setAttribute("runCount", response.runCount);
      const result = await runtime.waitForBatch({
        id: response.id,
        runCount: response.runCount,
        ctx
      });
      const runs2 = await handleBatchTaskRunExecutionResult(result.items, id);
      return {
        id: result.id,
        runs: runs2
      };
    }, {
      kind: SpanKind.PRODUCER,
      attributes: {
        [SemanticInternalAttributes.STYLE_ICON]: "trigger",
        ...accessoryAttributes({
          items: [
            {
              text: id,
              variant: "normal"
            }
          ],
          style: "codepath"
        })
      }
    });
  }
}
async function handleBatchTaskRunExecutionResult(items, taskIdentifier) {
  const someObjectStoreOutputs = items.some((item) => item.ok && item.outputType === "application/store");
  if (!someObjectStoreOutputs) {
    const results = await Promise.all(items.map(async (item) => {
      return await handleTaskRunExecutionResult(item, taskIdentifier);
    }));
    return results;
  }
  return await tracer.startActiveSpan("store.downloadPayloads", async (span) => {
    const results = await Promise.all(items.map(async (item) => {
      return await handleTaskRunExecutionResult(item, taskIdentifier);
    }));
    return results;
  }, {
    kind: SpanKind.INTERNAL,
    [SemanticInternalAttributes.STYLE_ICON]: "cloud-download"
  });
}
async function handleTaskRunExecutionResult(execution, taskIdentifier) {
  if (execution.ok) {
    const outputPacket = { data: execution.output, dataType: execution.outputType };
    const importedPacket = await conditionallyImportPacket(outputPacket, tracer);
    return {
      ok: true,
      id: execution.id,
      taskIdentifier: execution.taskIdentifier ?? taskIdentifier,
      output: await parsePacket(importedPacket)
    };
  } else {
    return {
      ok: false,
      id: execution.id,
      taskIdentifier: execution.taskIdentifier ?? taskIdentifier,
      error: createErrorTaskError(execution.error)
    };
  }
}

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.3.3_bufferutil@4.1.0_typescript@5.9.3_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/hooks.js
function onStart(fnOrName, fn) {
  lifecycleHooks.registerGlobalStartHook({
    id: typeof fnOrName === "string" ? fnOrName : fnOrName.name ? fnOrName.name : void 0,
    fn: typeof fnOrName === "function" ? fnOrName : fn
  });
}
function onStartAttempt(fnOrName, fn) {
  lifecycleHooks.registerGlobalStartAttemptHook({
    id: typeof fnOrName === "string" ? fnOrName : fnOrName.name ? fnOrName.name : void 0,
    fn: typeof fnOrName === "function" ? fnOrName : fn
  });
}
function onFailure(fnOrName, fn) {
  lifecycleHooks.registerGlobalFailureHook({
    id: typeof fnOrName === "string" ? fnOrName : fnOrName.name ? fnOrName.name : void 0,
    fn: typeof fnOrName === "function" ? fnOrName : fn
  });
}
function onSuccess(fnOrName, fn) {
  lifecycleHooks.registerGlobalSuccessHook({
    id: typeof fnOrName === "string" ? fnOrName : fnOrName.name ? fnOrName.name : void 0,
    fn: typeof fnOrName === "function" ? fnOrName : fn
  });
}
function onComplete(fnOrName, fn) {
  lifecycleHooks.registerGlobalCompleteHook({
    id: typeof fnOrName === "string" ? fnOrName : fnOrName.name ? fnOrName.name : void 0,
    fn: typeof fnOrName === "function" ? fnOrName : fn
  });
}
function onWait(fnOrName, fn) {
  lifecycleHooks.registerGlobalWaitHook({
    id: typeof fnOrName === "string" ? fnOrName : fnOrName.name ? fnOrName.name : void 0,
    fn: typeof fnOrName === "function" ? fnOrName : fn
  });
}
function onResume(fnOrName, fn) {
  lifecycleHooks.registerGlobalResumeHook({
    id: typeof fnOrName === "string" ? fnOrName : fnOrName.name ? fnOrName.name : void 0,
    fn: typeof fnOrName === "function" ? fnOrName : fn
  });
}
function onHandleError(fnOrName, fn) {
  onCatchError(fnOrName, fn);
}
function onCatchError(fnOrName, fn) {
  lifecycleHooks.registerGlobalCatchErrorHook({
    id: typeof fnOrName === "string" ? fnOrName : fnOrName.name ? fnOrName.name : void 0,
    fn: typeof fnOrName === "function" ? fnOrName : fn
  });
}
function middleware(fnOrName, fn) {
  lifecycleHooks.registerGlobalMiddlewareHook({
    id: typeof fnOrName === "string" ? fnOrName : fnOrName.name ? fnOrName.name : void 0,
    fn: typeof fnOrName === "function" ? fnOrName : fn
  });
}
function onCancel(fnOrName, fn) {
  lifecycleHooks.registerGlobalCancelHook({
    id: typeof fnOrName === "string" ? fnOrName : fnOrName.name ? fnOrName.name : void 0,
    fn: typeof fnOrName === "function" ? fnOrName : fn
  });
}

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.3.3_bufferutil@4.1.0_typescript@5.9.3_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/tasks.js
var tasks = {
  trigger,
  batchTrigger,
  triggerAndWait,
  batchTriggerAndWait,
  /** @deprecated Use onStartAttempt instead */
  onStart,
  onStartAttempt,
  onFailure,
  onSuccess,
  onComplete,
  onWait,
  onResume,
  onCancel,
  /** @deprecated Use catchError instead */
  handleError: onHandleError,
  catchError: onCatchError,
  middleware
};

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.3.3_bufferutil@4.1.0_typescript@5.9.3_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/streams.js
var DEFAULT_STREAM_KEY = "default";
function pipe(keyOrValue, valueOrOptions, options) {
  let key;
  let value;
  let opts;
  if (typeof keyOrValue === "string") {
    key = keyOrValue;
    value = valueOrOptions;
    opts = options;
  } else {
    key = DEFAULT_STREAM_KEY;
    value = keyOrValue;
    opts = valueOrOptions;
  }
  return pipeInternal(key, value, opts, "streams.pipe()");
}
function pipeInternal(key, value, opts, spanName) {
  const runId = getRunIdForOptions(opts);
  if (!runId) {
    throw new Error("Could not determine the target run ID for the realtime stream. Please specify a target run ID using the `target` option or use this function from inside a task.");
  }
  const span = tracer.startSpan(spanName, {
    attributes: {
      key,
      runId,
      [SemanticInternalAttributes.ENTITY_TYPE]: "realtime-stream",
      [SemanticInternalAttributes.ENTITY_ID]: `${runId}:${key}`,
      [SemanticInternalAttributes.STYLE_ICON]: "streams",
      ...accessoryAttributes({
        items: [
          {
            text: key,
            variant: "normal"
          }
        ],
        style: "codepath"
      })
    }
  });
  const requestOptions = mergeRequestOptions({}, opts?.requestOptions);
  try {
    const instance = realtimeStreams.pipe(key, value, {
      signal: opts?.signal,
      target: runId,
      requestOptions
    });
    instance.wait().finally(() => {
      span.end();
    });
    return {
      stream: instance.stream,
      waitUntilComplete: () => instance.wait()
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      span.end();
      throw error;
    }
    if (error instanceof Error || typeof error === "string") {
      span.recordException(error);
    } else {
      span.recordException(String(error));
    }
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
    throw error;
  }
}
async function read(runId, keyOrOptions, options) {
  let key;
  let opts;
  if (typeof keyOrOptions === "string") {
    key = keyOrOptions;
    opts = options;
  } else {
    key = DEFAULT_STREAM_KEY;
    opts = keyOrOptions;
  }
  return readStreamImpl(runId, key, opts);
}
async function readStreamImpl(runId, key, options) {
  const apiClient = apiClientManager.clientOrThrow();
  const span = tracer.startSpan("streams.read()", {
    attributes: {
      key,
      runId,
      [SemanticInternalAttributes.ENTITY_TYPE]: "realtime-stream",
      [SemanticInternalAttributes.ENTITY_ID]: `${runId}:${key}`,
      [SemanticInternalAttributes.ENTITY_METADATA]: JSON.stringify({
        startIndex: options?.startIndex
      }),
      [SemanticInternalAttributes.STYLE_ICON]: "streams",
      ...accessoryAttributes({
        items: [
          {
            text: key,
            variant: "normal"
          }
        ],
        style: "codepath"
      })
    }
  });
  return await apiClient.fetchStream(runId, key, {
    signal: options?.signal,
    timeoutInSeconds: options?.timeoutInSeconds ?? 60,
    lastEventId: options?.startIndex ? (options.startIndex - 1).toString() : void 0,
    onComplete: () => {
      span.end();
    },
    onError: (error) => {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
    }
  });
}
function append(keyOrValue, valueOrOptions, options) {
  if (typeof keyOrValue === "string" && typeof valueOrOptions === "string") {
    return appendInternal(keyOrValue, valueOrOptions, options);
  }
  if (typeof keyOrValue === "string") {
    if (isAppendStreamOptions(valueOrOptions)) {
      return appendInternal(DEFAULT_STREAM_KEY, keyOrValue, valueOrOptions);
    } else {
      if (!valueOrOptions) {
        return appendInternal(DEFAULT_STREAM_KEY, keyOrValue, options);
      }
      return appendInternal(keyOrValue, valueOrOptions, options);
    }
  } else {
    if (isAppendStreamOptions(valueOrOptions)) {
      return appendInternal(DEFAULT_STREAM_KEY, keyOrValue, valueOrOptions);
    } else {
      return appendInternal(DEFAULT_STREAM_KEY, keyOrValue, options);
    }
  }
}
async function appendInternal(key, part, options) {
  const runId = getRunIdForOptions(options);
  if (!runId) {
    throw new Error("Could not determine the target run ID for the realtime stream. Please specify a target run ID using the `target` option or use this function from inside a task.");
  }
  const span = tracer.startSpan("streams.append()", {
    attributes: {
      key,
      runId,
      [SemanticInternalAttributes.ENTITY_TYPE]: "realtime-stream",
      [SemanticInternalAttributes.ENTITY_ID]: `${runId}:${key}`,
      [SemanticInternalAttributes.STYLE_ICON]: "streams",
      ...accessoryAttributes({
        items: [
          {
            text: key,
            variant: "normal"
          }
        ],
        style: "codepath"
      })
    }
  });
  try {
    await realtimeStreams.append(key, part, options);
    span.end();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      span.end();
      throw error;
    }
    if (error instanceof Error || typeof error === "string") {
      span.recordException(error);
    } else {
      span.recordException(String(error));
    }
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
    throw error;
  }
}
function isAppendStreamOptions(val) {
  return typeof val === "object" && val !== null && !Array.isArray(val) && ("target" in val && typeof val.target === "string" || "requestOptions" in val && typeof val.requestOptions === "object");
}
function writer(keyOrOptions, valueOrOptions) {
  if (typeof keyOrOptions === "string") {
    return writerInternal(keyOrOptions, valueOrOptions);
  }
  return writerInternal(DEFAULT_STREAM_KEY, keyOrOptions);
}
function writerInternal(key, options) {
  let controller;
  const ongoingStreamPromises = [];
  const stream2 = new ReadableStream({
    start(controllerArg) {
      controller = controllerArg;
    }
  });
  function safeEnqueue(data) {
    try {
      controller.enqueue(data);
    } catch (error) {
    }
  }
  try {
    const result = options.execute({
      write(part) {
        safeEnqueue(part);
      },
      merge(streamArg) {
        ongoingStreamPromises.push((async () => {
          const reader = streamArg.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done)
              break;
            safeEnqueue(value);
          }
        })().catch((error) => {
          console.error(error);
        }));
      }
    });
    if (result) {
      ongoingStreamPromises.push(result.catch((error) => {
        console.error(error);
      }));
    }
  } catch (error) {
    console.error(error);
  }
  const waitForStreams = new Promise((resolve, reject) => {
    (async () => {
      while (ongoingStreamPromises.length > 0) {
        await ongoingStreamPromises.shift();
      }
      resolve();
    })().catch(reject);
  });
  waitForStreams.finally(() => {
    try {
      controller.close();
    } catch (error) {
    }
  });
  return pipeInternal(key, stream2, options, "streams.writer()");
}
function define2(opts) {
  return {
    id: opts.id,
    pipe(value, options) {
      return pipe(opts.id, value, options);
    },
    read(runId, options) {
      return read(runId, opts.id, options);
    },
    append(value, options) {
      return append(opts.id, value, options);
    },
    writer(options) {
      return writer(opts.id, options);
    }
  };
}
var streams = {
  pipe,
  read,
  append,
  writer,
  define: define2
};
function getRunIdForOptions(options) {
  if (options?.target) {
    if (options.target === "parent") {
      return taskContext.ctx?.run?.parentTaskRunId;
    }
    if (options.target === "root") {
      return taskContext.ctx?.run?.rootTaskRunId;
    }
    if (options.target === "self") {
      return taskContext.ctx?.run?.id;
    }
    return options.target;
  }
  return taskContext.ctx?.run?.id;
}

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.3.3_bufferutil@4.1.0_typescript@5.9.3_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/metadata.js
var parentMetadataUpdater = runMetadata.parent;
var rootMetadataUpdater = runMetadata.root;
var metadataUpdater = {
  set: setMetadataKey,
  del: deleteMetadataKey,
  append: appendMetadataKey,
  remove: removeMetadataKey,
  increment: incrementMetadataKey,
  decrement: decrementMetadataKey,
  flush: flushMetadata
};
var metadata = {
  current: currentMetadata,
  get: getMetadataKey,
  save: saveMetadata,
  replace: replaceMetadata,
  stream,
  fetchStream,
  parent: parentMetadataUpdater,
  root: rootMetadataUpdater,
  refresh: refreshMetadata,
  ...metadataUpdater
};
function currentMetadata() {
  return runMetadata.current();
}
function getMetadataKey(key) {
  return runMetadata.getKey(key);
}
function setMetadataKey(key, value) {
  runMetadata.set(key, value);
  return metadataUpdater;
}
function deleteMetadataKey(key) {
  runMetadata.del(key);
  return metadataUpdater;
}
function replaceMetadata(metadata2) {
  runMetadata.update(metadata2);
}
function saveMetadata(metadata2) {
  runMetadata.update(metadata2);
}
function incrementMetadataKey(key, value = 1) {
  runMetadata.increment(key, value);
  return metadataUpdater;
}
function decrementMetadataKey(key, value = 1) {
  runMetadata.decrement(key, value);
  return metadataUpdater;
}
function appendMetadataKey(key, value) {
  runMetadata.append(key, value);
  return metadataUpdater;
}
function removeMetadataKey(key, value) {
  runMetadata.remove(key, value);
  return metadataUpdater;
}
async function flushMetadata(requestOptions) {
  const $requestOptions = mergeRequestOptions({
    tracer,
    name: "metadata.flush()",
    icon: "code-plus"
  }, requestOptions);
  await runMetadata.flush($requestOptions);
}
async function refreshMetadata(requestOptions) {
  const $requestOptions = mergeRequestOptions({
    tracer,
    name: "metadata.refresh()",
    icon: "code-plus"
  }, requestOptions);
  await runMetadata.refresh($requestOptions);
}
async function stream(key, value, signal) {
  const streamInstance = await streams.pipe(key, value, {
    signal
  });
  return streamInstance.stream;
}
async function fetchStream(key, signal) {
  return runMetadata.fetchStream(key, signal);
}

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.3.3_bufferutil@4.1.0_typescript@5.9.3_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/timeout.js
var MAXIMUM_MAX_DURATION = 2147483647;
var timeout2 = {
  None: MAXIMUM_MAX_DURATION,
  signal: timeout.signal
};

// src/webhooks/handlers/customers.ts
async function handleCustomerCreate(tenantId, payload, _eventId) {
  const customer = payload;
  const shopifyCustomerId = customer.id.toString();
  await withTenant2(tenantId, async () => {
    await upsertCustomer(customer);
    if (customer.addresses && customer.addresses.length > 0) {
      await syncCustomerAddresses(shopifyCustomerId, customer.addresses);
    }
  });
  await tasks.trigger("commerce-customer-sync", {
    tenantId,
    customerId: shopifyCustomerId,
    shopifyCustomerId,
    fullSync: false
  });
  console.log(`[Webhook] Customer ${shopifyCustomerId} created for tenant ${tenantId}`);
}
async function handleCustomerUpdate(tenantId, payload, _eventId) {
  const customer = payload;
  const shopifyCustomerId = customer.id.toString();
  await withTenant2(tenantId, async () => {
    await upsertCustomer(customer);
    if (customer.addresses && customer.addresses.length > 0) {
      await syncCustomerAddresses(shopifyCustomerId, customer.addresses);
    }
  });
  await tasks.trigger("commerce-customer-sync", {
    tenantId,
    customerId: shopifyCustomerId,
    shopifyCustomerId,
    fullSync: false
  });
  console.log(`[Webhook] Customer ${shopifyCustomerId} updated for tenant ${tenantId}`);
}
async function upsertCustomer(customer) {
  const shopifyCustomerId = customer.id.toString();
  const tags = customer.tags ? customer.tags.split(",").map((t2) => t2.trim()).filter(Boolean) : [];
  await sql2`
    INSERT INTO customers (
      shopify_id,
      email,
      first_name,
      last_name,
      phone,
      orders_count,
      total_spent_cents,
      tags,
      shopify_created_at,
      synced_at
    ) VALUES (
      ${shopifyCustomerId},
      ${customer.email || null},
      ${customer.first_name || null},
      ${customer.last_name || null},
      ${customer.phone || null},
      ${customer.orders_count},
      ${Math.round(parseFloat(customer.total_spent || "0") * 100)},
      ${JSON.stringify(tags)},
      ${customer.created_at},
      NOW()
    )
    ON CONFLICT (shopify_id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      phone = EXCLUDED.phone,
      orders_count = EXCLUDED.orders_count,
      total_spent_cents = EXCLUDED.total_spent_cents,
      tags = EXCLUDED.tags,
      synced_at = NOW()
  `;
  if (customer.default_address) {
    await sql2`
      UPDATE customers
      SET
        default_address_line1 = ${customer.default_address.address1 || null},
        default_address_line2 = ${customer.default_address.address2 || null},
        default_address_city = ${customer.default_address.city || null},
        default_address_province = ${customer.default_address.province || null},
        default_address_province_code = ${customer.default_address.province_code || null},
        default_address_country = ${customer.default_address.country || null},
        default_address_country_code = ${customer.default_address.country_code || null},
        default_address_zip = ${customer.default_address.zip || null}
      WHERE shopify_id = ${shopifyCustomerId}
    `;
  }
}
async function syncCustomerAddresses(customerId, addresses) {
  if (!addresses || addresses.length === 0) {
    return;
  }
  await sql2`DELETE FROM customer_addresses WHERE customer_shopify_id = ${customerId}`;
  for (let i2 = 0; i2 < addresses.length; i2++) {
    const address = addresses[i2];
    if (!address) continue;
    await sql2`
      INSERT INTO customer_addresses (
        customer_shopify_id,
        address_index,
        first_name,
        last_name,
        address1,
        address2,
        city,
        province,
        province_code,
        country,
        country_code,
        zip,
        phone
      ) VALUES (
        ${customerId},
        ${i2},
        ${address.first_name || null},
        ${address.last_name || null},
        ${address.address1 || null},
        ${address.address2 || null},
        ${address.city || null},
        ${address.province || null},
        ${address.province_code || null},
        ${address.country || null},
        ${address.country_code || null},
        ${address.zip || null},
        ${address.phone || null}
      )
    `;
  }
}

// src/webhooks/handlers/fulfillments.ts
import { withTenant as withTenant3, sql as sql3 } from "@cgk-platform/db";
async function handleFulfillmentCreate(tenantId, payload, _eventId) {
  const fulfillment = payload;
  const shopifyFulfillmentId = fulfillment.id.toString();
  const orderId = fulfillment.order_id.toString();
  await withTenant3(tenantId, async () => {
    await sql3`
      INSERT INTO fulfillments (
        shopify_fulfillment_id,
        order_shopify_id,
        status,
        tracking_company,
        tracking_number,
        tracking_url,
        created_at,
        updated_at
      ) VALUES (
        ${shopifyFulfillmentId},
        ${orderId},
        ${fulfillment.status},
        ${fulfillment.tracking_company || null},
        ${fulfillment.tracking_number || fulfillment.tracking_numbers?.[0] || null},
        ${fulfillment.tracking_url || fulfillment.tracking_urls?.[0] || null},
        ${fulfillment.created_at},
        ${fulfillment.updated_at}
      )
      ON CONFLICT (shopify_fulfillment_id) DO UPDATE SET
        status = EXCLUDED.status,
        tracking_company = EXCLUDED.tracking_company,
        tracking_number = EXCLUDED.tracking_number,
        tracking_url = EXCLUDED.tracking_url,
        updated_at = EXCLUDED.updated_at
    `;
    await sql3`
      UPDATE orders
      SET
        fulfillment_status = 'fulfilled',
        synced_at = NOW()
      WHERE shopify_id = ${orderId}
    `;
  });
  await Promise.all([
    // Queue review request email processing
    tasks.trigger("commerce-process-review-email-queue", {
      tenantId,
      limit: 50,
      dryRun: false
    }),
    // Handle order fulfilled for project linking and other processing
    tasks.trigger("commerce-handle-order-fulfilled", {
      tenantId,
      orderId,
      fulfillmentId: shopifyFulfillmentId,
      trackingNumber: fulfillment.tracking_number || fulfillment.tracking_numbers?.[0] || null,
      carrier: fulfillment.tracking_company || null
    })
  ]);
  console.log(
    `[Webhook] Fulfillment ${shopifyFulfillmentId} created for order ${orderId}, tenant ${tenantId}`
  );
}
async function handleFulfillmentUpdate(tenantId, payload, _eventId) {
  const fulfillment = payload;
  const shopifyFulfillmentId = fulfillment.id.toString();
  const orderId = fulfillment.order_id.toString();
  let trackingChanged = false;
  await withTenant3(tenantId, async () => {
    const existing = await sql3`
      SELECT tracking_number, status
      FROM fulfillments
      WHERE shopify_fulfillment_id = ${shopifyFulfillmentId}
    `;
    const newTrackingNumber = fulfillment.tracking_number || fulfillment.tracking_numbers?.[0] || null;
    if (existing.rows.length > 0 && existing.rows[0]) {
      const oldTracking = existing.rows[0].tracking_number;
      trackingChanged = oldTracking !== newTrackingNumber;
    }
    await sql3`
      INSERT INTO fulfillments (
        shopify_fulfillment_id,
        order_shopify_id,
        status,
        tracking_company,
        tracking_number,
        tracking_url,
        created_at,
        updated_at
      ) VALUES (
        ${shopifyFulfillmentId},
        ${orderId},
        ${fulfillment.status},
        ${fulfillment.tracking_company || null},
        ${newTrackingNumber},
        ${fulfillment.tracking_url || fulfillment.tracking_urls?.[0] || null},
        ${fulfillment.created_at},
        ${fulfillment.updated_at}
      )
      ON CONFLICT (shopify_fulfillment_id) DO UPDATE SET
        status = EXCLUDED.status,
        tracking_company = EXCLUDED.tracking_company,
        tracking_number = EXCLUDED.tracking_number,
        tracking_url = EXCLUDED.tracking_url,
        updated_at = EXCLUDED.updated_at
    `;
  });
  if (trackingChanged) {
    await tasks.trigger("commerce-handle-order-fulfilled", {
      tenantId,
      orderId,
      fulfillmentId: shopifyFulfillmentId,
      trackingNumber: fulfillment.tracking_number || fulfillment.tracking_numbers?.[0] || null,
      carrier: fulfillment.tracking_company || null
    });
  }
  console.log(
    `[Webhook] Fulfillment ${shopifyFulfillmentId} updated for order ${orderId}, tenant ${tenantId}`
  );
}

// src/webhooks/handlers/gdpr.ts
import { withTenant as withTenant4, sql as sql4 } from "@cgk-platform/db";
async function handleCustomerRedact(tenantId, payload, _eventId) {
  const data = payload;
  const customerId = String(data.customer.id);
  await withTenant4(tenantId, async () => {
    await sql4`
      UPDATE customers
      SET
        email = CONCAT('redacted-', shopify_id, '@redacted.invalid'),
        first_name = 'Redacted',
        last_name = 'Customer',
        phone = NULL,
        default_address_line1 = NULL,
        default_address_line2 = NULL,
        default_address_city = NULL,
        default_address_province = NULL,
        default_address_zip = NULL,
        updated_at = NOW()
      WHERE shopify_id = ${customerId}
    `;
    if (data.orders_to_redact.length > 0) {
      const orderIds = `{${data.orders_to_redact.join(",")}}`;
      await sql4`
        UPDATE orders
        SET
          customer_email = CONCAT('redacted-', shopify_id, '@redacted.invalid'),
          updated_at = NOW()
        WHERE customer_id = ${customerId}
          AND shopify_id = ANY(${orderIds}::text[])
      `;
    }
    await sql4`
      DELETE FROM customer_addresses
      WHERE customer_shopify_id = ${customerId}
    `;
  });
  console.log(`[GDPR] Customer ${customerId} PII redacted for tenant ${tenantId} (shop: ${data.shop_domain})`);
}
async function handleShopRedact(tenantId, payload, _eventId) {
  const data = payload;
  await sql4`
    UPDATE shopify_connections
    SET
      status = 'deleted',
      access_token_encrypted = NULL,
      webhook_secret_encrypted = NULL,
      storefront_api_token_encrypted = NULL,
      updated_at = NOW()
    WHERE shop = ${data.shop_domain}
  `;
  console.log(`[GDPR] Shop ${data.shop_domain} credentials cleared for tenant ${tenantId}`);
}
async function handleCustomerDataRequest(tenantId, payload, _eventId) {
  const data = payload;
  const customerId = String(data.customer.id);
  await withTenant4(tenantId, async () => {
    await sql4`
      INSERT INTO webhook_events (
        shop,
        topic,
        shopify_webhook_id,
        payload,
        hmac_verified,
        idempotency_key,
        headers,
        status
      ) VALUES (
        ${data.shop_domain},
        'customers/data_request',
        NULL,
        ${JSON.stringify(data)},
        TRUE,
        ${`gdpr-data-request:${customerId}:${data.shop_domain}`},
        '{}',
        'completed'
      )
      ON CONFLICT (idempotency_key) DO NOTHING
    `;
  });
  console.log(`[GDPR] Data request logged for customer ${customerId} at shop ${data.shop_domain}, tenant ${tenantId}`);
}
async function handleCustomerDelete(tenantId, payload, _eventId) {
  const customer = payload;
  const customerId = String(customer.id);
  await withTenant4(tenantId, async () => {
    await sql4`
      UPDATE customers
      SET
        email = CONCAT('deleted-', shopify_id, '@deleted.invalid'),
        first_name = 'Deleted',
        last_name = 'User',
        phone = NULL,
        updated_at = NOW()
      WHERE shopify_id = ${customerId}
    `;
    await sql4`
      DELETE FROM customer_addresses
      WHERE customer_shopify_id = ${customerId}
    `;
  });
  console.log(`[Webhook] Customer ${customerId} deleted for tenant ${tenantId}`);
}

// src/webhooks/handlers/orders.ts
import { withTenant as withTenant5, sql as sql6 } from "@cgk-platform/db";

// src/webhooks/utils.ts
import crypto from "crypto";
import { sql as sql5 } from "@cgk-platform/db";
function verifyShopifyWebhook(body, signature, secret) {
  const hmac = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}
async function getTenantForShop(shop) {
  const shopifyResult = await sql5`
    SELECT tenant_id
    FROM shopify_connections
    WHERE shop = ${shop}
    AND status = 'active'
    LIMIT 1
  `;
  if (shopifyResult.rows.length > 0) {
    const row2 = shopifyResult.rows[0];
    return row2 ? row2.tenant_id : null;
  }
  const orgResult = await sql5`
    SELECT id as tenant_id
    FROM public.organizations
    WHERE shopify_store_domain = ${shop}
    AND status = 'active'
    LIMIT 1
  `;
  const row = orgResult.rows[0];
  return row ? row.tenant_id : null;
}
async function getShopifyCredentials(_tenantId, shop) {
  const result = await sql5`
    SELECT
      shop,
      access_token_encrypted,
      webhook_secret_encrypted
    FROM shopify_connections
    WHERE shop = ${shop}
    LIMIT 1
  `;
  if (result.rows.length === 0) {
    return null;
  }
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return {
    shop: row.shop,
    accessToken: row.access_token_encrypted,
    webhookSecret: row.webhook_secret_encrypted
  };
}
async function checkDuplicateWebhook(idempotencyKey) {
  const result = await sql5`
    SELECT id FROM webhook_events
    WHERE idempotency_key = ${idempotencyKey}
    AND status IN ('completed', 'processing')
    LIMIT 1
  `;
  return result.rows.length > 0;
}
async function logWebhookEvent(params) {
  const result = await sql5`
    INSERT INTO webhook_events (
      shop,
      topic,
      shopify_webhook_id,
      payload,
      hmac_verified,
      idempotency_key,
      headers,
      status
    ) VALUES (
      ${params.shop},
      ${params.topic},
      ${params.shopifyWebhookId},
      ${JSON.stringify(params.payload)},
      ${params.hmacVerified},
      ${params.idempotencyKey},
      ${JSON.stringify(params.headers)},
      'pending'
    )
    ON CONFLICT (idempotency_key) DO UPDATE SET
      retry_count = webhook_events.retry_count + 1,
      status = 'pending'
    RETURNING id
  `;
  const row = result.rows[0];
  return row ? row.id : "";
}
async function updateWebhookStatus(eventId, status, errorMessage) {
  if (status === "completed") {
    await sql5`
      UPDATE webhook_events
      SET
        status = ${status},
        processed_at = NOW(),
        error_message = NULL
      WHERE id = ${eventId}
    `;
  } else if (status === "failed") {
    await sql5`
      UPDATE webhook_events
      SET
        status = ${status},
        error_message = ${errorMessage || null},
        retry_count = retry_count + 1
      WHERE id = ${eventId}
    `;
  } else {
    await sql5`
      UPDATE webhook_events
      SET status = ${status}
      WHERE id = ${eventId}
    `;
  }
}
async function getWebhookEvent(eventId) {
  const result = await sql5`
    SELECT
      id,
      shop,
      topic,
      shopify_webhook_id as "shopifyWebhookId",
      payload,
      hmac_verified as "hmacVerified",
      status,
      processed_at as "processedAt",
      error_message as "errorMessage",
      retry_count as "retryCount",
      idempotency_key as "idempotencyKey",
      received_at as "receivedAt",
      headers
    FROM webhook_events
    WHERE id = ${eventId}
  `;
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
}
function parseCents(priceString) {
  if (priceString === void 0 || priceString === null) {
    return 0;
  }
  const price = typeof priceString === "string" ? parseFloat(priceString) : priceString;
  return Math.round(price * 100);
}
function mapFinancialStatus(status) {
  if (!status) return "pending";
  const statusMap = {
    pending: "pending",
    authorized: "authorized",
    partially_paid: "partially_paid",
    paid: "paid",
    partially_refunded: "partially_refunded",
    refunded: "refunded",
    voided: "voided"
  };
  return statusMap[status] || "pending";
}
function mapFulfillmentStatus(status) {
  if (!status) return "unfulfilled";
  const statusMap = {
    fulfilled: "fulfilled",
    partial: "partial",
    unfulfilled: "unfulfilled",
    restocked: "restocked"
  };
  return statusMap[status] || "unfulfilled";
}
function extractResourceId(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const p2 = payload;
  if ("id" in p2 && (typeof p2.id === "string" || typeof p2.id === "number")) {
    return String(p2.id);
  }
  if ("order_id" in p2 && (typeof p2.order_id === "string" || typeof p2.order_id === "number")) {
    return String(p2.order_id);
  }
  return null;
}
function generateIdempotencyKey2(topic, resourceId, webhookId) {
  const id = resourceId || webhookId || Date.now().toString();
  return `${topic}:${id}`;
}
function headersToObject(headers) {
  const result = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

// src/webhooks/handlers/orders.ts
async function handleOrderCreate(tenantId, payload, _eventId) {
  const order = payload;
  const shopifyId = order.id.toString();
  const orderName = order.name;
  await withTenant5(tenantId, async () => {
    const discountCodes = order.discount_codes?.map((d2) => d2.code) || [];
    const tags = order.tags ? order.tags.split(",").map((t2) => t2.trim()).filter(Boolean) : [];
    const shippingCents = order.total_shipping_price_set?.shop_money?.amount ? parseCents(order.total_shipping_price_set.shop_money.amount) : 0;
    await sql6`
      INSERT INTO orders (
        shopify_id,
        shopify_order_number,
        created_at,
        customer_email,
        customer_id,
        gross_sales_cents,
        discounts_cents,
        net_sales_cents,
        taxes_cents,
        shipping_cents,
        total_price_cents,
        financial_status,
        fulfillment_status,
        discount_codes,
        tags,
        currency,
        synced_at
      ) VALUES (
        ${shopifyId},
        ${orderName},
        ${order.created_at},
        ${order.email || order.customer?.email || null},
        ${order.customer?.id?.toString() || null},
        ${parseCents(order.subtotal_price)},
        ${parseCents(order.total_discounts)},
        ${parseCents(order.subtotal_price) - parseCents(order.total_discounts)},
        ${parseCents(order.total_tax)},
        ${shippingCents},
        ${parseCents(order.total_price)},
        ${mapFinancialStatus(order.financial_status)},
        ${mapFulfillmentStatus(order.fulfillment_status)},
        ${JSON.stringify(discountCodes)},
        ${JSON.stringify(tags)},
        ${order.currency || "USD"},
        NOW()
      )
      ON CONFLICT (shopify_id) DO UPDATE SET
        financial_status = EXCLUDED.financial_status,
        fulfillment_status = EXCLUDED.fulfillment_status,
        discounts_cents = EXCLUDED.discounts_cents,
        net_sales_cents = EXCLUDED.net_sales_cents,
        total_price_cents = EXCLUDED.total_price_cents,
        tags = EXCLUDED.tags,
        synced_at = NOW()
    `;
    await syncOrderLineItems(shopifyId, order.line_items);
  });
  const netSalesCents = parseCents(order.subtotal_price) - parseCents(order.total_discounts);
  await Promise.all([
    // Attribution processing
    tasks.trigger("commerce-order-attribution", {
      tenantId,
      orderId: shopifyId,
      customerId: order.customer?.id?.toString() || null,
      sessionId: null
      // Session ID should be extracted from note attributes if available
    }),
    // Creator commission check
    tasks.trigger("commerce-order-commission", {
      tenantId,
      orderId: shopifyId,
      discountCode: order.discount_codes?.[0]?.code || null,
      orderTotal: netSalesCents / 100,
      // Convert cents to dollars
      currency: order.currency || "USD"
    }),
    // Handle order created for additional processing (A/B attribution, pixel events)
    tasks.trigger("commerce-handle-order-created", {
      tenantId,
      orderId: shopifyId,
      shopifyOrderId: shopifyId,
      customerId: order.customer?.id?.toString() || null,
      totalAmount: parseCents(order.total_price) / 100,
      currency: order.currency || "USD"
    })
  ]);
  console.log(`[Webhook] Order ${orderName} created for tenant ${tenantId}`);
}
async function handleOrderPaid(tenantId, payload, eventId) {
  const order = payload;
  await handleOrderUpdate(tenantId, payload, eventId);
  await Promise.all([
    // Handle order created for gift card rewards processing
    tasks.trigger("commerce-handle-order-created", {
      tenantId,
      orderId: order.id.toString(),
      shopifyOrderId: order.id.toString(),
      customerId: order.customer?.id?.toString() || null,
      totalAmount: parseCents(order.total_price) / 100,
      currency: order.currency || "USD"
    }),
    // Send pixel events and additional processing
    tasks.trigger("commerce-order-attribution", {
      tenantId,
      orderId: order.id.toString(),
      customerId: order.customer?.id?.toString() || null,
      sessionId: null
      // Session ID should be extracted from note attributes if available
    })
  ]);
  console.log(`[Webhook] Order ${order.name} paid for tenant ${tenantId}`);
}
async function handleOrderUpdate(tenantId, payload, _eventId) {
  const order = payload;
  const shopifyId = order.id.toString();
  await withTenant5(tenantId, async () => {
    await sql6`
      UPDATE orders
      SET
        financial_status = ${mapFinancialStatus(order.financial_status)},
        fulfillment_status = ${mapFulfillmentStatus(order.fulfillment_status)},
        cancelled_at = ${order.cancelled_at || null},
        synced_at = NOW()
      WHERE shopify_id = ${shopifyId}
    `;
  });
  console.log(`[Webhook] Order ${order.name} updated for tenant ${tenantId}`);
}
async function handleOrderCancelled(tenantId, payload, eventId) {
  const order = payload;
  const shopifyId = order.id.toString();
  await handleOrderUpdate(tenantId, payload, eventId);
  await Promise.all([
    // Handle order created for A/B test exclusion and other processing
    tasks.trigger("commerce-handle-order-created", {
      tenantId,
      orderId: shopifyId,
      shopifyOrderId: shopifyId,
      customerId: order.customer?.id?.toString() || null,
      totalAmount: parseCents(order.total_price) / 100,
      currency: order.currency || "USD"
    }),
    // Reverse commissions using order commission task
    tasks.trigger("commerce-order-commission", {
      tenantId,
      orderId: shopifyId,
      discountCode: null,
      orderTotal: 0,
      // Zero out commission
      currency: order.currency || "USD"
    })
  ]);
  console.log(`[Webhook] Order ${order.name} cancelled for tenant ${tenantId}`);
}
async function syncOrderLineItems(orderId, lineItems) {
  await sql6`DELETE FROM order_line_items WHERE order_shopify_id = ${orderId}`;
  for (const item of lineItems) {
    await sql6`
      INSERT INTO order_line_items (
        order_shopify_id,
        shopify_line_item_id,
        product_id,
        variant_id,
        title,
        quantity,
        price_cents,
        sku,
        variant_title
      ) VALUES (
        ${orderId},
        ${item.id.toString()},
        ${item.product_id?.toString() || null},
        ${item.variant_id?.toString() || null},
        ${item.title},
        ${item.quantity},
        ${parseCents(item.price)},
        ${item.sku || null},
        ${item.variant_title || null}
      )
    `;
  }
}

// src/webhooks/handlers/products.ts
import { withTenant as withTenant6, sql as sql7 } from "@cgk-platform/db";
async function handleProductCreate(tenantId, payload, _eventId) {
  const product = payload;
  const shopifyProductId = product.id.toString();
  await tasks.trigger("commerce-product-sync", {
    tenantId,
    shopifyProductId,
    action: "create"
  });
  console.log(`[Webhook] Product ${shopifyProductId} created for tenant ${tenantId}`);
}
async function handleProductUpdate(tenantId, payload, _eventId) {
  const product = payload;
  const shopifyProductId = product.id.toString();
  await tasks.trigger("commerce-product-sync", {
    tenantId,
    shopifyProductId,
    action: "update"
  });
  console.log(`[Webhook] Product ${shopifyProductId} updated for tenant ${tenantId}`);
}
async function handleProductDelete(tenantId, payload, _eventId) {
  const product = payload;
  const shopifyProductId = product.id.toString();
  await withTenant6(tenantId, async () => {
    await sql7`
      UPDATE products
      SET
        status = 'archived',
        updated_at = NOW()
      WHERE shopify_product_id = ${shopifyProductId}
    `;
  });
  console.log(`[Webhook] Product ${shopifyProductId} deleted/archived for tenant ${tenantId}`);
}

// src/webhooks/handlers/refunds.ts
import { withTenant as withTenant7, sql as sql8 } from "@cgk-platform/db";
async function handleRefundCreate(tenantId, payload, _eventId) {
  const refund = payload;
  const shopifyRefundId = refund.id.toString();
  const orderId = refund.order_id.toString();
  const totalRefundCents = refund.transactions.reduce((sum, txn) => {
    if (txn.status === "success" && txn.kind === "refund") {
      return sum + parseCents(txn.amount);
    }
    return sum;
  }, 0);
  await withTenant7(tenantId, async () => {
    const refundResult = await sql8`
      INSERT INTO refunds (
        shopify_refund_id,
        order_shopify_id,
        amount_cents,
        reason,
        processed_at,
        created_at
      ) VALUES (
        ${shopifyRefundId},
        ${orderId},
        ${totalRefundCents},
        ${refund.note || null},
        ${refund.processed_at || null},
        ${refund.created_at}
      )
      ON CONFLICT (shopify_refund_id) DO UPDATE SET
        amount_cents = EXCLUDED.amount_cents,
        reason = EXCLUDED.reason,
        processed_at = EXCLUDED.processed_at
      RETURNING id
    `;
    const refundId = refundResult.rows[0]?.id;
    await sql8`
      UPDATE orders
      SET
        financial_status = 'partially_refunded',
        refunded_cents = COALESCE(refunded_cents, 0) + ${totalRefundCents},
        synced_at = NOW()
      WHERE shopify_id = ${orderId}
    `;
    if (refundId) {
      await sql8`DELETE FROM refund_line_items WHERE refund_id = ${refundId}`;
      for (const item of refund.refund_line_items) {
        await sql8`
          INSERT INTO refund_line_items (
            refund_id,
            shopify_line_item_id,
            quantity,
            amount_cents
          ) VALUES (
            ${refundId},
            ${item.line_item_id.toString()},
            ${item.quantity},
            ${parseCents(item.subtotal) + parseCents(item.total_tax)}
          )
        `;
      }
    }
  });
  await Promise.all([
    // Adjust creator commissions using order commission task
    tasks.trigger("commerce-order-commission", {
      tenantId,
      orderId,
      discountCode: null,
      orderTotal: -(totalRefundCents / 100),
      // Negative for refund
      currency: "USD"
    }),
    // Handle order created for pixel events and additional processing
    tasks.trigger("commerce-handle-order-created", {
      tenantId,
      orderId,
      shopifyOrderId: orderId,
      customerId: null,
      totalAmount: -(totalRefundCents / 100),
      // Negative for refund
      currency: "USD"
    }),
    // Update analytics using order attribution task
    tasks.trigger("commerce-order-attribution", {
      tenantId,
      orderId,
      customerId: null,
      sessionId: null
    })
  ]);
  console.log(
    `[Webhook] Refund ${shopifyRefundId} created for order ${orderId}, amount: ${totalRefundCents} cents, tenant ${tenantId}`
  );
}

// src/webhooks/router.ts
var HANDLERS = {
  // Orders
  "orders/create": handleOrderCreate,
  "orders/updated": handleOrderUpdate,
  "orders/paid": handleOrderPaid,
  "orders/cancelled": handleOrderCancelled,
  "orders/fulfilled": handleOrderUpdate,
  // Refunds & fulfillments
  "refunds/create": handleRefundCreate,
  "fulfillments/create": handleFulfillmentCreate,
  "fulfillments/update": handleFulfillmentUpdate,
  // Customers
  "customers/create": handleCustomerCreate,
  "customers/update": handleCustomerUpdate,
  "customers/delete": handleCustomerDelete,
  // Products
  "products/create": handleProductCreate,
  "products/update": handleProductUpdate,
  "products/delete": handleProductDelete,
  // Inventory (no-op stub — handled by product-sync job)
  "inventory_levels/update": async (_tenantId, _payload, _eventId) => {
  },
  // App lifecycle
  "app/uninstalled": handleAppUninstalled,
  // GDPR mandatory (registered via Partner Dashboard, not REST API)
  "customers/redact": handleCustomerRedact,
  "shop/redact": handleShopRedact,
  "customers/data_request": handleCustomerDataRequest
};
async function routeToHandler(tenantId, topic, payload, eventId) {
  const handler = HANDLERS[topic];
  if (!handler) {
    console.log(`[Webhook] No handler registered for topic: ${topic}`);
    return;
  }
  await handler(tenantId, payload, eventId);
}
function hasHandler(topic) {
  return topic in HANDLERS;
}
function getRegisteredTopics() {
  return Object.keys(HANDLERS);
}
function registerHandler(topic, handler) {
  HANDLERS[topic] = handler;
}

// src/webhooks/handler.ts
async function handleShopifyWebhook(request) {
  const startTime = Date.now();
  const shop = request.headers.get("x-shopify-shop-domain");
  const topic = request.headers.get("x-shopify-topic");
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  if (!shop || !topic || !hmac) {
    console.warn("[Webhook] Missing required headers", { shop, topic, hasHmac: !!hmac });
    return new Response("Missing required headers", { status: 400 });
  }
  const tenantId = await getTenantForShop(shop);
  if (!tenantId) {
    console.warn(`[Webhook] Unknown shop: ${shop}, topic: ${topic}`);
    return new Response("Shop not registered", { status: 200 });
  }
  const body = await request.text();
  const credentials = await withTenant8(tenantId, async () => {
    return getShopifyCredentials(tenantId, shop);
  });
  if (!credentials || !credentials.webhookSecret) {
    console.error(`[Webhook] No webhook secret for shop ${shop}, tenant ${tenantId}`);
    return new Response("Configuration error", { status: 500 });
  }
  const isValid2 = verifyShopifyWebhook(body, hmac, credentials.webhookSecret);
  if (!isValid2) {
    console.error(`[Webhook] Invalid HMAC signature for ${shop}, topic: ${topic}`);
    return new Response("Invalid signature", { status: 401 });
  }
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    console.error(`[Webhook] Invalid JSON for ${shop}, topic: ${topic}`);
    return new Response("Invalid JSON", { status: 400 });
  }
  const resourceId = extractResourceId(payload);
  const idempotencyKey = generateIdempotencyKey2(topic, resourceId, webhookId);
  const isDuplicate = await withTenant8(tenantId, async () => {
    return checkDuplicateWebhook(idempotencyKey);
  });
  if (isDuplicate) {
    console.log(`[Webhook] Duplicate ignored: ${idempotencyKey} for ${shop}`);
    return new Response("Already processed", { status: 200 });
  }
  const eventId = await withTenant8(tenantId, async () => {
    return logWebhookEvent({
      shop,
      topic,
      shopifyWebhookId: webhookId,
      payload,
      hmacVerified: true,
      idempotencyKey,
      headers: headersToObject(request.headers)
    });
  });
  try {
    await withTenant8(tenantId, async () => {
      await routeToHandler(tenantId, topic, payload, eventId);
    });
    await withTenant8(tenantId, async () => {
      await updateWebhookStatus(eventId, "completed");
    });
    const duration = Date.now() - startTime;
    console.log(`[Webhook] ${topic} processed in ${duration}ms for ${shop}`);
    return new Response("OK", { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await withTenant8(tenantId, async () => {
      await updateWebhookStatus(eventId, "failed", errorMessage);
    });
    console.error(`[Webhook] ${topic} failed for ${shop}:`, error);
    console.log(`[Webhook] Event ${eventId} marked as failed \u2014 scheduled retry job will pick it up`);
    return new Response("Processing error", { status: 200 });
  }
}
function createWebhookRoute() {
  return async function POST(request) {
    return handleShopifyWebhook(request);
  };
}

// src/webhooks/register.ts
import { withTenant as withTenant9, sql as sql9 } from "@cgk-platform/db";
var REQUIRED_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/paid",
  "orders/cancelled",
  "orders/fulfilled",
  "refunds/create",
  "fulfillments/create",
  "fulfillments/update",
  "customers/create",
  "customers/update",
  "app/uninstalled"
];
var OPTIONAL_TOPICS = {
  "commerce.product_sync": ["products/create", "products/update"],
  "commerce.inventory_sync": ["inventory_levels/update"],
  "commerce.abandoned_cart": ["checkouts/create", "checkouts/update"],
  "commerce.draft_orders": ["draft_orders/create"],
  "subscriptions.enabled": ["subscription_contracts/create", "subscription_contracts/update"]
};
var CREATE_WEBHOOK_MUTATION = `
  mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;
var LIST_WEBHOOKS_QUERY = `
  query {
    webhookSubscriptions(first: 50) {
      edges {
        node {
          id
          topic
          endpoint {
            __typename
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
          }
        }
      }
    }
  }
`;
var DELETE_WEBHOOK_MUTATION = `
  mutation webhookSubscriptionDelete($id: ID!) {
    webhookSubscriptionDelete(id: $id) {
      deletedWebhookSubscriptionId
      userErrors {
        field
        message
      }
    }
  }
`;
function topicToEnum(topic) {
  return topic.replace("/", "_").toUpperCase();
}
async function registerWebhooks(tenantId, shop, accessToken, webhookUrl) {
  const client = createAdminClient({
    storeDomain: shop,
    adminAccessToken: accessToken
  });
  const errors = [];
  for (const topic of REQUIRED_TOPICS) {
    try {
      const result = await client.query(CREATE_WEBHOOK_MUTATION, {
        topic: topicToEnum(topic),
        webhookSubscription: {
          callbackUrl: webhookUrl,
          format: "JSON"
        }
      });
      const { webhookSubscription, userErrors } = result.webhookSubscriptionCreate;
      if (userErrors && userErrors.length > 0) {
        const firstError = userErrors[0];
        const error = firstError ? firstError.message : "Unknown error";
        console.error(`[Webhook] Failed to register ${topic} for ${shop}: ${error}`);
        errors.push({ topic, error });
        continue;
      }
      if (webhookSubscription) {
        await withTenant9(tenantId, async () => {
          await sql9`
            INSERT INTO webhook_registrations (shop, topic, shopify_webhook_id, address, status)
            VALUES (${shop}, ${topic}, ${webhookSubscription.id}, ${webhookUrl}, 'active')
            ON CONFLICT (shop, topic) DO UPDATE SET
              shopify_webhook_id = EXCLUDED.shopify_webhook_id,
              address = EXCLUDED.address,
              status = 'active',
              failure_count = 0,
              updated_at = NOW()
          `;
        });
        console.log(`[Webhook] Registered ${topic} for ${shop}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Webhook] Failed to register ${topic} for ${shop}:`, error);
      errors.push({ topic, error: message });
    }
  }
  if (errors.length > 0) {
    console.error(`[Webhook] ${errors.length} webhooks failed to register for ${shop}`);
  }
}
async function registerSingleWebhook(tenantId, shop, accessToken, topic, webhookUrl) {
  const client = createAdminClient({
    storeDomain: shop,
    adminAccessToken: accessToken
  });
  try {
    const result = await client.query(CREATE_WEBHOOK_MUTATION, {
      topic: topicToEnum(topic),
      webhookSubscription: {
        callbackUrl: webhookUrl,
        format: "JSON"
      }
    });
    const { webhookSubscription, userErrors } = result.webhookSubscriptionCreate;
    if (userErrors && userErrors.length > 0) {
      const firstError = userErrors[0];
      return { success: false, error: firstError ? firstError.message : "Unknown error" };
    }
    if (webhookSubscription) {
      await withTenant9(tenantId, async () => {
        await sql9`
          INSERT INTO webhook_registrations (shop, topic, shopify_webhook_id, address, status)
          VALUES (${shop}, ${topic}, ${webhookSubscription.id}, ${webhookUrl}, 'active')
          ON CONFLICT (shop, topic) DO UPDATE SET
            shopify_webhook_id = EXCLUDED.shopify_webhook_id,
            address = EXCLUDED.address,
            status = 'active',
            failure_count = 0,
            updated_at = NOW()
        `;
      });
      return { success: true };
    }
    return { success: false, error: "No webhook subscription returned" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
async function syncWebhookRegistrations(tenantId, shop, credentials, webhookUrl) {
  const client = createAdminClient({
    storeDomain: shop,
    adminAccessToken: credentials.accessToken
  });
  const result = {
    added: [],
    removed: [],
    unchanged: [],
    errors: []
  };
  try {
    const shopifyResponse = await client.query(LIST_WEBHOOKS_QUERY);
    const shopifyWebhooks = shopifyResponse.webhookSubscriptions.edges.map((e) => ({
      id: e.node.id,
      topic: e.node.topic.toLowerCase().replace("_", "/"),
      url: e.node.endpoint.callbackUrl
    }));
    const ourRegistrations = await withTenant9(tenantId, async () => {
      const res = await sql9`
        SELECT topic, shopify_webhook_id, status
        FROM webhook_registrations
        WHERE shop = ${shop}
      `;
      return res.rows;
    });
    for (const topic of REQUIRED_TOPICS) {
      const existsInShopify = shopifyWebhooks.some(
        (w) => w.topic === topic && w.url === webhookUrl
      );
      if (!existsInShopify) {
        const registerResult = await registerSingleWebhook(
          tenantId,
          shop,
          credentials.accessToken,
          topic,
          webhookUrl
        );
        if (registerResult.success) {
          result.added.push(topic);
        } else {
          result.errors.push({ topic, error: registerResult.error || "Failed to register" });
        }
      } else {
        result.unchanged.push(topic);
      }
    }
    for (const reg of ourRegistrations) {
      const existsInShopify = shopifyWebhooks.some(
        (w) => w.id === reg.shopify_webhook_id
      );
      if (!existsInShopify && reg.status !== "deleted") {
        await withTenant9(tenantId, async () => {
          await sql9`
            UPDATE webhook_registrations
            SET status = 'deleted', updated_at = NOW()
            WHERE shop = ${shop} AND topic = ${reg.topic}
          `;
        });
        result.removed.push(reg.topic);
      }
    }
    return result;
  } catch (error) {
    console.error(`[Webhook] Sync failed for ${shop}:`, error);
    throw error;
  }
}
async function unregisterWebhook(tenantId, shop, accessToken, topic) {
  const registration = await withTenant9(tenantId, async () => {
    const res = await sql9`
      SELECT shopify_webhook_id
      FROM webhook_registrations
      WHERE shop = ${shop} AND topic = ${topic}
    `;
    return res.rows[0];
  });
  if (!registration?.shopify_webhook_id) {
    console.log(`[Webhook] No registration found for ${topic} on ${shop}`);
    return;
  }
  const client = createAdminClient({
    storeDomain: shop,
    adminAccessToken: accessToken
  });
  try {
    await client.query(DELETE_WEBHOOK_MUTATION, {
      id: registration.shopify_webhook_id
    });
    await withTenant9(tenantId, async () => {
      await sql9`
        UPDATE webhook_registrations
        SET status = 'deleted', updated_at = NOW()
        WHERE shop = ${shop} AND topic = ${topic}
      `;
    });
    console.log(`[Webhook] Unregistered ${topic} for ${shop}`);
  } catch (error) {
    console.error(`[Webhook] Failed to unregister ${topic} for ${shop}:`, error);
    throw error;
  }
}

// src/webhooks/health.ts
import { withTenant as withTenant10, sql as sql10 } from "@cgk-platform/db";
async function getWebhookHealth(tenantId, shop) {
  return withTenant10(tenantId, async () => {
    const registrations = await sql10`
      SELECT
        topic,
        status,
        last_success_at as "lastSuccessAt",
        failure_count as "failureCount"
      FROM webhook_registrations
      WHERE shop = ${shop}
      ORDER BY topic
    `;
    const eventStats = await sql10`
      SELECT
        COUNT(*) FILTER (WHERE true) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
      FROM webhook_events
      WHERE shop = ${shop}
      AND received_at > NOW() - INTERVAL '24 hours'
    `;
    const stats = eventStats.rows[0];
    return {
      shop,
      registrations: registrations.rows,
      recentEvents: {
        total: parseInt(stats.total, 10),
        completed: parseInt(stats.completed, 10),
        failed: parseInt(stats.failed, 10),
        pending: parseInt(stats.pending, 10)
      }
    };
  });
}
async function getRecentWebhookEvents(tenantId, shop, options = {}) {
  const { limit = 50, offset = 0, status, topic } = options;
  return withTenant10(tenantId, async () => {
    let countResult;
    let events;
    if (status && topic) {
      countResult = await sql10`
        SELECT COUNT(*) as count FROM webhook_events
        WHERE shop = ${shop} AND status = ${status} AND topic = ${topic}
      `;
      events = await sql10`
        SELECT id, shop, topic, shopify_webhook_id as "shopifyWebhookId",
          payload, hmac_verified as "hmacVerified", status,
          processed_at as "processedAt", error_message as "errorMessage",
          retry_count as "retryCount", idempotency_key as "idempotencyKey",
          received_at as "receivedAt", headers
        FROM webhook_events
        WHERE shop = ${shop} AND status = ${status} AND topic = ${topic}
        ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (status) {
      countResult = await sql10`
        SELECT COUNT(*) as count FROM webhook_events
        WHERE shop = ${shop} AND status = ${status}
      `;
      events = await sql10`
        SELECT id, shop, topic, shopify_webhook_id as "shopifyWebhookId",
          payload, hmac_verified as "hmacVerified", status,
          processed_at as "processedAt", error_message as "errorMessage",
          retry_count as "retryCount", idempotency_key as "idempotencyKey",
          received_at as "receivedAt", headers
        FROM webhook_events
        WHERE shop = ${shop} AND status = ${status}
        ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (topic) {
      countResult = await sql10`
        SELECT COUNT(*) as count FROM webhook_events
        WHERE shop = ${shop} AND topic = ${topic}
      `;
      events = await sql10`
        SELECT id, shop, topic, shopify_webhook_id as "shopifyWebhookId",
          payload, hmac_verified as "hmacVerified", status,
          processed_at as "processedAt", error_message as "errorMessage",
          retry_count as "retryCount", idempotency_key as "idempotencyKey",
          received_at as "receivedAt", headers
        FROM webhook_events
        WHERE shop = ${shop} AND topic = ${topic}
        ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      countResult = await sql10`
        SELECT COUNT(*) as count FROM webhook_events WHERE shop = ${shop}
      `;
      events = await sql10`
        SELECT id, shop, topic, shopify_webhook_id as "shopifyWebhookId",
          payload, hmac_verified as "hmacVerified", status,
          processed_at as "processedAt", error_message as "errorMessage",
          retry_count as "retryCount", idempotency_key as "idempotencyKey",
          received_at as "receivedAt", headers
        FROM webhook_events WHERE shop = ${shop}
        ORDER BY received_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    }
    const countRow = countResult.rows[0];
    return {
      events: events.rows,
      total: countRow ? parseInt(countRow.count, 10) : 0
    };
  });
}
async function getFailedWebhooksForRetry(tenantId, options = {}) {
  const { maxRetries = 3, hoursAgo = 24, limit = 50 } = options;
  return withTenant10(tenantId, async () => {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);
    const result = await sql10`
      SELECT
        id,
        shop,
        topic,
        shopify_webhook_id as "shopifyWebhookId",
        payload,
        hmac_verified as "hmacVerified",
        status,
        processed_at as "processedAt",
        error_message as "errorMessage",
        retry_count as "retryCount",
        idempotency_key as "idempotencyKey",
        received_at as "receivedAt",
        headers
      FROM webhook_events
      WHERE status = 'failed'
      AND retry_count < ${maxRetries}
      AND received_at > ${cutoffDate.toISOString()}
      ORDER BY received_at ASC
      LIMIT ${limit}
    `;
    return result.rows;
  });
}
async function recordWebhookSuccess(tenantId, shop, topic) {
  await withTenant10(tenantId, async () => {
    await sql10`
      UPDATE webhook_registrations
      SET
        last_success_at = NOW(),
        failure_count = 0,
        status = 'active',
        updated_at = NOW()
      WHERE shop = ${shop} AND topic = ${topic}
    `;
  });
}
async function recordWebhookFailure(tenantId, shop, topic) {
  await withTenant10(tenantId, async () => {
    await sql10`
      UPDATE webhook_registrations
      SET
        last_failure_at = NOW(),
        failure_count = failure_count + 1,
        status = CASE
          WHEN failure_count >= 5 THEN 'failed'
          ELSE status
        END,
        updated_at = NOW()
      WHERE shop = ${shop} AND topic = ${topic}
    `;
  });
}
async function getWebhookEventsByTopic(tenantId, shop, days = 7) {
  return withTenant10(tenantId, async () => {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const result = await sql10`
      SELECT
        topic,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'failed') as "failedCount"
      FROM webhook_events
      WHERE shop = ${shop}
      AND received_at > ${cutoffDate.toISOString()}
      GROUP BY topic
      ORDER BY count DESC
    `;
    return result.rows.map((row) => ({
      topic: row.topic,
      count: parseInt(row.count, 10),
      failedCount: parseInt(row.failedCount, 10)
    }));
  });
}
export {
  OPTIONAL_TOPICS,
  REQUIRED_TOPICS,
  checkDuplicateWebhook,
  createWebhookRoute,
  extractResourceId,
  generateIdempotencyKey2 as generateIdempotencyKey,
  getFailedWebhooksForRetry,
  getRecentWebhookEvents,
  getRegisteredTopics,
  getShopifyCredentials,
  getTenantForShop,
  getWebhookEvent,
  getWebhookEventsByTopic,
  getWebhookHealth,
  handleAppUninstalled,
  handleCustomerCreate,
  handleCustomerUpdate,
  handleFulfillmentCreate,
  handleFulfillmentUpdate,
  handleOrderCancelled,
  handleOrderCreate,
  handleOrderPaid,
  handleOrderUpdate,
  handleRefundCreate,
  handleShopifyWebhook,
  hasHandler,
  headersToObject,
  logWebhookEvent,
  mapFinancialStatus,
  mapFulfillmentStatus,
  parseCents,
  recordWebhookFailure,
  recordWebhookSuccess,
  registerHandler,
  registerSingleWebhook,
  registerWebhooks,
  routeToHandler,
  syncWebhookRegistrations,
  unregisterWebhook,
  updateWebhookStatus,
  verifyShopifyWebhook
};
/*! Bundled license information:

@google-cloud/precise-date/build/src/index.js:
  (*!
   * Copyright 2019 Google Inc. All Rights Reserved.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
