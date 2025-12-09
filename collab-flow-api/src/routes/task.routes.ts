import { Router } from 'express'
import { taskController } from '../controllers/task.controller'

const router = Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       required:
 *         - id
 *         - projectId
 *         - title
 *         - status
 *         - order
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the task
 *         projectId:
 *           type: string
 *           description: The id of the project this task belongs to
 *         title:
 *           type: string
 *           description: The title of the task
 *         description:
 *           type: string
 *           description: The description of the task
 *         status:
 *           type: string
 *           description: The status of the task
 *           enum: [backlog, todo, inprogress, done]
 *         order:
 *           type: number
 *           description: The order of the task
 *         assignee:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The creation date of the task
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The last update date of the task
 */

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Returns the list of all the tasks
 *     responses:
 *       200:
 *         description: The list of the tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 */
router.get(`/`, taskController.getTasks)

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get the task by id
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The task id
 *     responses:
 *       200:
 *         description: The task description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: The task was not found
 */
router.get(`/:id`, taskController.getTask)

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Task'
 *     responses:
 *       201:
 *         description: The task was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Bad request
 */
router.post(`/`, taskController.createTask)

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update the task by id
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The task id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Task'
 *     responses:
 *       200:
 *         description: The task was successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: The task was not found
 *       400:
 *         description: Bad request
 */
router.put(`/:id`, taskController.updateTask)

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete the task by id
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The task id
 *     responses:
 *       204:
 *         description: The task was successfully deleted
 *       404:
 *         description: The task was not found
 */
router.delete(`/:id`, taskController.deleteTask)

export default router
