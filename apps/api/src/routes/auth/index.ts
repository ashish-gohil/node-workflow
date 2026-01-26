import { Router } from "express";
import signup from "./signup.js";
import credentials from "./credentials.js";
import oauth from "./oauth.js";
import syncUser from "./sync-user.js";

const router: Router = Router();

router.use(signup);
router.use(credentials);
router.use(oauth);
router.use(syncUser);

export default router;
