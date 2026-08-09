/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as feedback from "../feedback.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_openrouter from "../lib/openrouter.js";
import type * as lib_rubric from "../lib/rubric.js";
import type * as lib_screenshots from "../lib/screenshots.js";
import type * as owner from "../owner.js";
import type * as payments from "../payments.js";
import type * as reviewActions from "../reviewActions.js";
import type * as scanActions from "../scanActions.js";
import type * as scanInternal from "../scanInternal.js";
import type * as scans from "../scans.js";
import type * as share from "../share.js";
import type * as stripeAnalytics from "../stripeAnalytics.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  feedback: typeof feedback;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/openrouter": typeof lib_openrouter;
  "lib/rubric": typeof lib_rubric;
  "lib/screenshots": typeof lib_screenshots;
  owner: typeof owner;
  payments: typeof payments;
  reviewActions: typeof reviewActions;
  scanActions: typeof scanActions;
  scanInternal: typeof scanInternal;
  scans: typeof scans;
  share: typeof share;
  stripeAnalytics: typeof stripeAnalytics;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
