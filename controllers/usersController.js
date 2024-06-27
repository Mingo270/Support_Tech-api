const User = require('../models/User')
const Note = require('../models/Note')
const bcrypt = require('bcrypt')

// @desc Get all users
// @route GET /users
// @access Private
const getAllUsers = async (req, res) => {
    // Get all users from MongoDB
    const users = await User.find().select('-password').lean()

    // If no users
    if (!users?.length) {
        return res.status(400).json({ message: 'Utilisateur introuvable' })
    }

    res.json(users)
}

// @desc Create new user
// @route POST /users
// @access Private
const createNewUser = async (req, res) => {
    const { username, password, roles } = req.body

    // Confirmer les données
    if (!username || !password) {
        return res.status(400).json({ message: 'Tous les champs sont requis' })
    }

    //
    // Rechercher un nom d'utilisateur en double
    const duplicate = await User.findOne({ username }).collation({ locale: 'en', strength: 2 }).lean().exec()

    if (duplicate) {
        return res.status(409).json({ message: 'Nom d\'utilisateur en double' })
    }

    // Hash password
    const hashedPwd = await bcrypt.hash(password, 10) // salt rounds

    const userObject = (!Array.isArray(roles) || !roles.length)
        ? { username, "password": hashedPwd }
        : { username, "password": hashedPwd, roles }

    // Create and store new user
    const user = await User.create(userObject)

    if (user) { //créer
        res.status(201).json({ message: `Nouvel utilisateur ${username} créer` })
    } else {
        res.status(400).json({ message: 'Données utilisateur invalides reçues' })
    }
}

// @desc Update a user
// @route PATCH /users
// @access Private
const updateUser = async (req, res) => {
    const { id, username, roles, active, password } = req.body

    // Confirmer les données
    if (!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean') {
        return res.status(400).json({ message: 'Tous les champs excepté mot de passe sont requis' })
    }

    // L'utilisateur existe-t-il pour mettre à jour ?
    const user = await User.findById(id).exec()

    if (!user) {
        return res.status(400).json({ message: 'Utilisateur introuvable' })
    }

    // Verifie les doublons
    const duplicate = await User.findOne({ username }).collation({ locale: 'en', strength: 2 }).lean().exec()

    // Autoriser les mises à jour pour l'utilisateur d'origine
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({ message: 'Nom d\'utilisateur en double' })
    }

    user.username = username
    user.roles = roles
    user.active = active

    if (password) {
        // Hash password
        user.password = await bcrypt.hash(password, 10) // salt rounds
    }

    const updatedUser = await user.save()

    res.json({ message: `${updatedUser.username} Mis à jour` })
}

// @desc Delete a user
// @route DELETE /users
// @access Private
const deleteUser = async (req, res) => {
    const { id } = req.body

    // Confirmer les données
    if (!id) {
        return res.status(400).json({ message: 'Requiert l\'ID d\'un utilisateur' })
    }

    //
    // L'utilisateur a-t-il encore des tickets attribuées ?
    const note = await Note.findOne({ user: id }).lean().exec()
    if (note) {
        return res.status(400).json({ message: 'L\'utilisateur a attribué des notes' })
    }

    // L'utilisateur existe-t-il pour le supprimer ?
    const user = await User.findById(id).exec()

    if (!user) {
        return res.status(400).json({ message: 'Pas d\'utilisateur trouvé'})
    }

    const result = await user.deleteOne()

    const reply = `Username ${result.username} with ID ${result._id} deleted`

    res.json(reply)
}

module.exports = {
    getAllUsers,
    createNewUser,
    updateUser,
    deleteUser
}