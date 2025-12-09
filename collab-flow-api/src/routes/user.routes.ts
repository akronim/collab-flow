import { Router } from 'express'
import { userController } from '../controllers/user.controller'

const router = Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - email
 *         - role
 *         - status
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the user
 *         name:
 *           type: string
 *           description: The name of the user
 *         email:
 *           type: string
 *           description: The email of the user
 *         avatar:
 *           type: string
 *           description: The avatar URL of the user
 *         role:
 *           type: string
 *           description: The role of the user
 *         title:
 *           type: string
 *           description: The title of the user
 *         organization:
 *           type: string
 *           description: The organization of the user
 *         status:
 *           type: string
 *           description: The status of the user
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: The last login date of the user
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The creation date of the user
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The last update date of the user
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Returns the list of all the users
 *     responses:
 *       200:
 *         description: The list of the users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get(`/`, userController.getUsers)

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get the user by id
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user id
 *     responses:
 *       200:
 *         description: The user description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: The user was not found
 */
router.get(`/:id`, userController.getUser)
router.post(`/`, userController.createUser)

export default router
