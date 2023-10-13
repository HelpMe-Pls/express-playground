const ejs = require('ejs')
const Genre = require("../models/genre");
const Book = require("../models/book");
const asyncHandler = require("express-async-handler");
const { body, validationResult } = require("express-validator");

// Display list of all Genre.
exports.genre_list = asyncHandler(async (req, res, next) => {
  const allGenres = await Genre.find().sort({ name: 1 }).exec();
  ejs.renderFile('views/genre-list.ejs', { title: 'Genre List', list_genres: allGenres, }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Genres", content: str });
    }
  });
});

// Display detail page for a specific Genre.
exports.genre_detail = asyncHandler(async (req, res, next) => {
  // Get details of genre and all associated books (in parallel)
  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, "title summary").exec(),
  ]);
  if (genre === null) {
    // No results.
    const err = new Error("Genre not found");
    err.status = 404;
    return next(err);
  }
  ejs.renderFile('views/genre-detail.ejs', {
    title: 'Genre Detail', genre,
    genre_books: booksInGenre,
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Genre Detail", content: str });
    }
  });
});

// Display Genre create form on GET.
exports.genre_create_get = async (req, res, next) => {
  ejs.renderFile('views/genre-form.ejs', {
    title: "Create Genre",
    errors: null
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Create Genre", content: str });
    }
  });
};

// Handle Genre create on POST.
exports.genre_create_post = [
  // Validate and sanitize the name field.
  body("name", "Genre name must contain at least 3 characters")
    .trim()
    .isLength({ min: 3 })
    .escape(),

  // Process request AFTER validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data from the sanitized `body` above.
    const genre = new Genre({ name: req.body.name });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      ejs.renderFile('views/genre-form.ejs', {
        title: "Create Genre",
        genre,
        errors: errors.array(),
      }, function (err, str) {
        if (err) {
          console.log(err);
        } else {
          res.render("layout", { title: "Create Genre", content: str });
        }
      });
    } else {
      // Data from form is valid.
      // Check if Genre with same name (case insensitive) already exists.
      const genreExists = await Genre.findOne({ name: req.body.name })
        .collation({ locale: "en", strength: 2 })
        .exec();
      if (genreExists) {
        // Genre exists, redirect to its detail page.
        res.redirect(genreExists.url);
      } else {
        await genre.save();
        // New genre saved. Redirect to genre list page.
        res.redirect('catalog/genres');
      }
    }
  }),
];

// Display Genre Update form on GET.
exports.genre_delete_get = asyncHandler(async (req, res, next) => {
  // Get details of genre and all associated books (in parallel)
  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, "title summary").exec(),
  ]);
  if (genre === null) {
    // No results.
    res.redirect("/catalog/genres");
  }
  ejs.renderFile('views/genre-delete.ejs', {
    title: "Delete Genre",
    genre,
    genre_books: booksInGenre,
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Delete Genre", content: str });
    }
  });
});

// Handle Genre delete on POST.
exports.genre_delete_post = asyncHandler(async (req, res, next) => {
  // Get details of genre and all associated books (in parallel)
  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, "title summary").exec(),
  ]);

  if (booksInGenre.length > 0) {
    // Genre has books. Render in same way as for GET route.
    ejs.renderFile('views/genre-delete.ejs', {
      title: "Delete Genre",
      genre,
      genre_books: booksInGenre,
    }, function (err, str) {
      if (err) {
        console.log(err);
      } else {
        res.render("layout", { title: "Delete Genre", content: str });
      }
    });
  } else {
    // Genre has no books. Delete object and redirect to the list of genres.
    await Genre.findByIdAndRemove(req.body.id);
    res.redirect("/catalog/genres");
  }
});

// Display Genre update form on GET.
exports.genre_update_get = asyncHandler(async (req, res, next) => {
  const genre = await Genre.findById(req.params.id).exec();

  if (genre === null) {
    // No results.
    const err = new Error("Genre not found");
    err.status = 404;
    return next(err);
  }
  ejs.renderFile('views/genre-form.ejs', {
    title: "Update Genre",
    genre,
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Update Genre", content: str });
    }
  });
});

// Handle Genre update on POST.
exports.genre_update_post = [
  // Validate and sanitize the name field.
  body("name", "Genre name must contain at least 3 characters")
    .trim()
    .isLength({ min: 3 })
    .escape(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request .
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data (and the old id!)
    const genre = new Genre({
      name: req.body.name,
      _id: req.params.id,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values and error messages.
      ejs.renderFile('views/genre-form.ejs', {
        title: "Update Genre",
        genre,
        errors: errors.array(),
      }, function (err, str) {
        if (err) {
          console.log(err);
        } else {
          res.render("layout", { title: "Update Genre", content: str });
        }
      });
    } else {
      // Data from form is valid. Update the record.
      await Genre.findByIdAndUpdate(req.params.id, genre);
      res.redirect(genre.url);
    }
  }),
];

