const express = require('express');
const router = express.Router();
const db = require('../db/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'coolsecretkey';
const {
  ensureCorrectUser,
  ensureLoggedIn,
  checkIfCompany,
  checkJobCreator,
  checkIfUser,
  ensureIfApplied
} = require('../middleware');

router.get('/', ensureLoggedIn, async (req, res, next) => {
  try {
    const data = await db.query('SELECT * FROM jobs LIMIT 50');
    console.log(data);
    return res.json(data.rows);
  } catch (err) {
    return next(err);
  }
});

router.post('/', checkIfCompany, async (req, res, next) => {
  try {
    // const validation = validate(req.body, jobNewSchema);
    // if (!validation.valid) {
    //   return next(
    //     new APIError(
    //       400,
    //       'Bad Request',
    //       validation.errors.map(e => e.stack).join('. ')
    //     )
    //   );
    // }

    // const { title, salary, equity, companyID } = validation;

    const token = req.headers.authorization;
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const handle = decodedToken.handle;
    const data = await db.query(
      'INSERT INTO jobs (title, salary, equity, company) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.body.title, req.body.salary, req.body.equity, handle]
    );
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', ensureLoggedIn, async (req, res, next) => {
  try {
    const data = await db.query('SELECT * FROM jobs WHERE id=$1', [
      req.params.id
    ]);
    console.log(data);
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', checkJobCreator, async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const handle = decodedToken.handle;
    const data = await db.query(
      'UPDATE jobs SET title=($1), salary=($2), equity=($3), company=($4) WHERE id=($5) RETURNING *',
      [req.body.title, req.body.salary, req.body.equity, handle, req.params.id]
    );
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', checkJobCreator, async (req, res, next) => {
  try {
    const data = await db.query('DELETE FROM jobs WHERE id=$1 RETURNING *', [
      req.params.id
    ]);
    return res.json(data.rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/apply', checkIfUser, async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const decodedToken = jwt.verify(token, SECRET_KEY);
    const username = decodedToken.username;

    const user_id = (await db.query('SELECT id FROM users WHERE username=$1', [
      username
    ])).rows[0].id;

    await db.query(
      'INSERT INTO jobs_users (user_id, job_id ) VALUES ($1, $2)',
      [user_id, req.params.id]
    );

    return res.json({ message: 'Successfully applied for job' });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id/apply', ensureIfApplied, async (req, res, next) => {
  try {
    await db.query('DELETE FROM jobs_users WHERE job_id = $1 AND user_id=$2', [
      req.params.id,
      req.user_id
    ]);

    return res.json({ message: 'Successfully deleted a job application' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
