import { Router } from 'express'
import { projectController } from '../controllers/project.controller'

const router = Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - description
 *         - createdAt
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the project
 *         name:
 *           type: string
 *           description: The name of the project
 *         description:
 *           type: string
 *           description: The description of the project
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The creation date of the project
 */

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Returns the list of all the projects
 *     responses:
 *       200:
 *         description: The list of the projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 */
router.get(`/`, projectController.getProjects)

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get the project by id
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The project id
 *     responses:
 *       200:
 *         description: The project description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: The project was not found
 */
router.get(`/:id`, projectController.getProject)

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       201:
 *         description: The project was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request
 */
router.post(`/`, projectController.createProject)

export default router
