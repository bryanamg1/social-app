import jwt from "jsonwebtoken";
import crypto from "crypto";

export function generateAccessToken(user) {
    return jwt.sign(
    {
        user: {
        user_id: user.id,
        email: user.email,
        name: user.name,
        },
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
    );
}

export function generateRefreshToken() {
    return crypto.randomBytes(64).toString("hex");
}