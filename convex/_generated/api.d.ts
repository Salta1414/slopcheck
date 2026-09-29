/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeys from "../apiKeys.js";
import type * as evalActions from "../evalActions.js";
import type * as feedback from "../feedback.js";
import type * as http from "../http.js";
import type * as lib_apiHttp from "../lib/apiHttp.js";
import type * as lib_apiKey from "../lib/apiKey.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_goldenSites from "../lib/goldenSites.js";
import type * as lib_kit from "../lib/kit.js";
import type * as lib_kitMarkdown from "../lib/kitMarkdown.js";
import type * as lib_kitValidator from "../lib/kitValidator.js";
import type * as lib_mcp from "../lib/mcp.js";
import type * as lib_openrouter from "../lib/openrouter.js";
import type * as lib_preeval from "../lib/preeval.js";
import type * as lib_recipes_frostedGlass from "../lib/recipes/frostedGlass.js";
import type * as lib_recipes_grainOverlay from "../lib/recipes/grainOverlay.js";
import type * as lib_recipes_index from "../lib/recipes/index.js";
import type * as lib_recipes_liquidGlass from "../lib/recipes/liquidGlass.js";
import type * as lib_recipes_magneticButton from "../lib/recipes/magneticButton.js";
import type * as lib_recipes_marquee from "../lib/recipes/marquee.js";
import type * as lib_recipes_meshGradient from "../lib/recipes/meshGradient.js";
import type * as lib_recipes_textReveal from "../lib/recipes/textReveal.js";
import type * as lib_recipes_tiltCard from "../lib/recipes/tiltCard.js";
import type * as lib_recipes_types from "../lib/recipes/types.js";
import type * as lib_rubric from "../lib/rubric.js";
import type * as lib_screenshots from "../lib/screenshots.js";
import type * as lib_url from "../lib/url.js";
import type * as owner from "../owner.js";
import type * as payments from "../payments.js";
import type * as reviewActions from "../reviewActions.js";
import type * as scanActions from "../scanActions.js";
import type * as scanInternal from "../scanInternal.js";
import type * as scans from "../scans.js";
import type * as share from "../share.js";
import type * as stripeAnalytics from "../stripeAnalytics.js";
import type * as users from "../users.js";
import type * as xShareScreenshot from "../xShareScreenshot.js";
import type * as xShareScreenshotInternal from "../xShareScreenshotInternal.js";
import type * as xShareScreenshotUpload from "../xShareScreenshotUpload.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys;
  evalActions: typeof evalActions;
  feedback: typeof feedback;
  http: typeof http;
  "lib/apiHttp": typeof lib_apiHttp;
  "lib/apiKey": typeof lib_apiKey;
  "lib/auth": typeof lib_auth;
  "lib/goldenSites": typeof lib_goldenSites;
  "lib/kit": typeof lib_kit;
  "lib/kitMarkdown": typeof lib_kitMarkdown;
  "lib/kitValidator": typeof lib_kitValidator;
  "lib/mcp": typeof lib_mcp;
  "lib/openrouter": typeof lib_openrouter;
  "lib/preeval": typeof lib_preeval;
  "lib/recipes/frostedGlass": typeof lib_recipes_frostedGlass;
  "lib/recipes/grainOverlay": typeof lib_recipes_grainOverlay;
  "lib/recipes/index": typeof lib_recipes_index;
  "lib/recipes/liquidGlass": typeof lib_recipes_liquidGlass;
  "lib/recipes/magneticButton": typeof lib_recipes_magneticButton;
  "lib/recipes/marquee": typeof lib_recipes_marquee;
  "lib/recipes/meshGradient": typeof lib_recipes_meshGradient;
  "lib/recipes/textReveal": typeof lib_recipes_textReveal;
  "lib/recipes/tiltCard": typeof lib_recipes_tiltCard;
  "lib/recipes/types": typeof lib_recipes_types;
  "lib/rubric": typeof lib_rubric;
  "lib/screenshots": typeof lib_screenshots;
  "lib/url": typeof lib_url;
  owner: typeof owner;
  payments: typeof payments;
  reviewActions: typeof reviewActions;
  scanActions: typeof scanActions;
  scanInternal: typeof scanInternal;
  scans: typeof scans;
  share: typeof share;
  stripeAnalytics: typeof stripeAnalytics;
  users: typeof users;
  xShareScreenshot: typeof xShareScreenshot;
  xShareScreenshotInternal: typeof xShareScreenshotInternal;
  xShareScreenshotUpload: typeof xShareScreenshotUpload;
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
