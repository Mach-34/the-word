import { ethers } from 'ethers';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that verifies a signature on a message to authz attribution
 * @param req - the http request context
 * @param res - the http response context
 * @param next - the next controller to call
 */
export function verifySignature(req: Request, res: Response, next: NextFunction) {
    try {
        // message can be the commitment or the secret depending on call
        const { address, signature, message } = req.body;

        // ecrecover address from signature
        const recovered = ethers.verifyMessage(message, signature);

        // check the authorization
        if (recovered.toLowerCase() === address.toLowerCase()) {
            next();
        } else {
            res.status(401).json({
                error: `Unauthorized: found sig from ${recovered} expecting sig from ${address}`
            });
        }
    } catch (error) {
        res.status(500).json({ error: "Error verifying signature" });
    }
}