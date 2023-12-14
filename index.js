// 1. IMPORTACIONES
const express = require('express');
const app = express();
const cors = require('cors');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

const auth = require('./middleware/authorization');

const connectDB = require('./config/db');

const Wok = require('./models/Wok');
const Usuario = require('./models/User');

// 2. MIDDLEWARES
// VARIABLES DE ENTORNO
require('dotenv').config();

// CONEXIÓN A DB
connectDB();

// Habilitar CORS
app.use(cors());

app.use(express.json());

// MERCADO PAGO
const mercadopago = require('mercadopago');
const { update } = require('./models/Wok');

mercadopago.configure({
  access_token: 'TEST-695027965126634-121802-510b23c7e4759300bfa01dc4bd7d8e09-309278269',
});

// 3. RUTEO

// A. WOKS

app.get('/obtener-pwoks', async (req, res) => {
  try {
    const woks = await Wok.find({});

    res.json({
      woks,
    });
  } catch (error) {
    res.status(500).json({
      msg: 'Hubo un error obteniendo los datos',
    });
  }
});

app.get('/obtener-pwok/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const wok = await Wok.findById(id);

    res.json({
      wok,
    });
  } catch (error) {
    res.status(500).json({
      msg: 'Hubo un error obteniendo los datos',
    });
  }
});

app.post('/crear-pwok', async (req, res) => {
  const { nombre, precio, imagen, descripcion } = req.body;

  try {
    const nuevoWok = await Wok.create({ nombre, precio, imagen, descripcion });

    res.json(nuevoWok);
  } catch (error) {
    res.status(500).json({
      msg: 'Hubo un error creando el wok',
      error,
    });
  }
});

app.put('/actualizar-pwok', async (req, res) => {
  const { id, nombre, precio } = req.body;

  try {
    const actualizacionWok = await Wok.findByIdAndUpdate(id, { nombre, precio }, { new: true });

    res.json(actualizacionWok);
  } catch (error) {
    res.status(500).json({
      msg: 'Hubo un error actualizando el wok',
    });
  }
});

app.delete('/borrar-pwok', async (req, res) => {
  const { id } = req.body;

  try {
    const wokBorrado = await Wok.findByIdAndRemove({ _id: id });

    res.json(wokBorrado);
  } catch (error) {
    res.status(500).json({
      msg: 'Hubo un error borrando el wok especificado',
    });
  }
});

// B. USUARIOS
// CREAR UN USUARIO
app.post('/usuario/crear', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    const respuestaDB = await Usuario.create({
      name,
      email,
      password: hashedPassword,
    });

    const payload = {
      user: {
        id: respuestaDB._id,
      },
    };

    jwt.sign(
      payload,
      process.env.SECRET,
      {
        expiresIn: 360000,
      },
      (error, token) => {
        if (error) throw error;

        res.json({
          token,
        });
      }
    );
  } catch (error) {
    return res.status(400).json({
      msg: error,
    });
  }
});

// INICIAR SESIÓN
app.post('/usuario/iniciar-sesion', async (req, res) => {
  const { email, password } = req.body;

  try {
    let foundUser = await Usuario.findOne({ email });

    if (!foundUser) {
      return res.status(400).json({ msg: 'El usuario no existe' });
    }

    const passCorrecto = await bcryptjs.compare(password, foundUser.password);

    if (!passCorrecto) {
      return await res.status(400).json({ msg: 'Password incorrecto' });
    }

    const payload = {
      user: {
        id: foundUser.id,
      },
    };

    jwt.sign(
      payload,
      process.env.SECRET,
      {
        expiresIn: 3600000,
      },
      (error, token) => {
        if (error) throw error;

        res.json({ token });
      }
    );
  } catch (error) {
    res.json({
      msg: 'Hubo un error',
      error,
    });
  }
});

// VERIFICAR USUARIO
app.get('/usuario/verificar-usuario', auth, async (req, res) => {
  try {
    const user = await Usuario.findById(req.user.id).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({
      msg: 'Hubo un error',
      error,
    });
  }
});

// ACTUALIZAR USUARIO
app.put('/usuario/actualizar', auth, async (req, res) => {
  const newDataForOurUser = req.body;

  try {
    const updatedUser = await Usuario.findByIdAndUpdate(req.user.id, newDataForOurUser, { new: true }).select(
      '-password'
    );

    res.json(updatedUser);
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

// C. CHECKOUT MERCADOPAGO
app.post('/mercadopago', async (req, res) => {
  const preference = req.body;
  const responseMP = await mercadopago.preferences.create(preference);

  console.log(responseMP);

  res.json({
    checkoutId: responseMP.body.id,
  });
});

// 4. SERVIDOR
app.listen(process.env.PORT, () => console.log('El servidor está de pie'));
