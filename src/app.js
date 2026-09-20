require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/auth");
const clientRoutes = require("./routes/client");
const supportRoutes = require("./routes/support");
const adminRoutes = require("./routes/admin");
const commonRoutes = require("./routes/common");
const v1Routes = require("./routes/v1");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api/auth", authRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", commonRoutes);

// الـ API العامة اللي عملاء المنصة بيستخدموها فعليًا من تطبيقاتهم (بمفتاح API، مش جلسة تسجيل دخول)
app.use("/v1", v1Routes);

// أي مسار غير معروف تحت /api يرجع 404 JSON بدل صفحة HTML
app.use("/api", (req, res) => res.status(404).json({ error: "المسار غير موجود" }));

module.exports = app;
