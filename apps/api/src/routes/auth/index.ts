import { Router } from "express";
import signup from "./signup";
import credentials from "./credentials";
import oauth from "./oauth";
import syncUser from "./sync-user";

const router: Router = Router();

router.use(signup);
router.use(credentials);
router.use(oauth);
router.use(syncUser);

export default router;
