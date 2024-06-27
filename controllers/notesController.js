const Note = require('../models/Note')
const User = require('../models/User')

// @desc Get all notes
// @route GET /notes
// @access Private
const getAllNotes = async (req, res) => {
    // Get tous les tickets de Note
    const notes = await Note.find().lean()

    // If aucun ticket
    if (!notes?.length) {
        return res.status(400).json({ message: 'Aucun ticket trouvé' })
    }

    // Ajouter un utilisateur a chaque ticket avant d'envoyer la reponse
    const notesWithUser = await Promise.all(notes.map(async (note) => {
        const user = await User.findById(note.user).lean().exec()
        return { ...note, username: user.username }
    }))

    res.json(notesWithUser)
}

// @desc Create new note
// @route POST /notes
// @access Private
const createNewNote = async (req, res) => {
    const { user, title, text } = req.body

    // Confirmer les données
    if (!user || !title || !text) {
        return res.status(400).json({ message: 'Tous les champs sont requis' })
    }

    // Trouve un ticket en doublon ou non
    const duplicate = await Note.findOne({ title }).collation({ locale: 'en', strength: 2 }).lean().exec()

    if (duplicate) {
        return res.status(409).json({ message: 'Nom du ticket en double' })
    }

    // Créer et stocker un nouvel utilisateur
    const note = await Note.create({ user, title, text })

    if (note) { // Created
        return res.status(201).json({ message: 'Nouveau ticket créer' })
    } else {
        return res.status(400).json({ message: 'Données du ticket invalide' })
    }

}

// @desc Update a note
// @route PATCH /notes
// @access Private
const updateNote = async (req, res) => {
    const { id, user, title, text, completed } = req.body

    // Confirmer les données
    if (!id || !user || !title || !text || typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'Tous les champs sont requis' })
    }

    // Confirmer qu'une note existe à mettre à jour
    const note = await Note.findById(id).exec()

    if (!note) {
        return res.status(400).json({ message: 'Ticket introuvable' })
    }

    // Rechercher un titre en double
    const duplicate = await Note.findOne({ title }).collation({ locale: 'fr', strength: 2 }).lean().exec()

    // Autoriser le renommage du ticket original
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({ message: 'ID du ticket en double' })
    }

    note.user = user
    note.title = title
    note.text = text
    note.completed = completed

    const updatedNote = await note.save()

    res.json(`'${updatedNote.title}' Mis à jour`)
}

// @desc Delete a note
// @route DELETE /notes
// @access Private
const deleteNote = async (req, res) => {
    const { id } = req.body

    // Confirmer les données
    if (!id) {
        return res.status(400).json({ message: 'L\'ID du ticket est requis' })
    }

    // Confirmer qu'un ticket existe à supprimer
    const note = await Note.findById(id).exec()

    if (!note) {
        return res.status(400).json({ message: 'Ticket introuvable' })
    }

    const result = await note.deleteOne()

    const reply = `Ticket '${result.title}' avec l\'ID ${result._id} est supprimé`

    res.json(reply)
}

module.exports = {
    getAllNotes,
    createNewNote,
    updateNote,
    deleteNote
}