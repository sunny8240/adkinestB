import { Router } from "express";
import { z } from "zod";
import { Contact } from "../models/Contact.js";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().min(10).max(3000),
});

export const contactRouter = Router();

contactRouter.post("/", async (req, res, next) => {
  try {
    const input = contactSchema.parse(req.body);
    const contact = await Contact.create(input);
    res.status(201).json({
      message: "Thanks. Your enquiry has been received.",
      id: contact.id,
    });
  } catch (error) {
    next(error);
  }
});
