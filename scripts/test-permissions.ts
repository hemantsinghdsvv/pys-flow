import { can } from "../src/lib/permissions";
console.log("Can student read attendance?", can("INTERN", "attendance:read"));
