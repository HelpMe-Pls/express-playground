const ejs = require('ejs')
const Book = require("../models/book");
const Author = require("../models/author");
const Genre = require("../models/genre");
const BookInstance = require("../models/bookinstance");

const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

exports.index = asyncHandler(async (_req, res, _next) => {
  // Get details of books, book instances, authors and genre counts (in parallel)
  const [
    numBooks,
    numBookInstances,
    numAvailableBookInstances,
    numAuthors,
    numGenres,
  ] = await Promise.all([
    Book.countDocuments({}).exec(),
    BookInstance.countDocuments({}).exec(),
    BookInstance.countDocuments({ status: "Available" }).exec(),
    Author.countDocuments({}).exec(),
    Author.countDocuments({}).exec(),
  ]);

  ejs.renderFile('views/index.ejs', {
    title: 'Local Library Home', book_count: numBooks,
    book_instance_count: numBookInstances,
    book_instance_available_count: numAvailableBookInstances,
    author_count: numAuthors,
    genre_count: numGenres,
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render('layout', { title: 'Local Library Home', content: str });
    }
  });
  // res.render("index", {
  //   title: "Local Library Home",
  //   book_count: numBooks,
  //   book_instance_count: numBookInstances,
  //   book_instance_available_count: numAvailableBookInstances,
  //   author_count: numAuthors,
  //   genre_count: numGenres,
  // });
});

// Display list of all books.
exports.book_list = asyncHandler(async (_req, res, _next) => {
  const allBooks = await Book.find({}, "title author")
    .sort({ title: 1 })
    .populate("author")
    .exec();
  // const allBooks = {}

  ejs.renderFile('views/book-list.ejs', { title: 'Book List', book_list: allBooks }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Book List", content: str });
    }
  });
});

// Display detail page for a specific book.
exports.book_detail = asyncHandler(async (req, res, next) => {
  // Get details of books, book instances for specific book
  const [book, bookInstances] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),
    BookInstance.find({ book: req.params.id }).exec(),
  ]);

  if (book === null) {
    // No results.
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  }
  ejs.renderFile('views/book-detail.ejs', {
    title: book.title,
    book,
    book_instances: bookInstances,
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Book Detail", content: str });
    }
  });
});

// Display book create form on GET.
exports.book_create_get = asyncHandler(async (req, res, next) => {
  // Get all authors and genres, which we can use for adding to our book.
  const [allAuthors, allGenres] = await Promise.all([
    Author.find().exec(),
    Genre.find().exec(),
  ]);
  ejs.renderFile('views/book-form.ejs', {
    title: "Create Book",
    authors: allAuthors,
    genres: allGenres,
    errors: null
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Create Book", content: str });
    }
  });
});

// Handle book create on POST.
exports.book_create_post = [
  // Convert the genre to an array.
  (req, _res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === "undefined") req.body.genre = [];
      else req.body.genre = new Array(req.body.genre);
    }
    next();
  },

  // Validate and sanitize fields.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),
  // Process request after validation and sanitization.

  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped and trimmed data.
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form.
      const [allAuthors, allGenres] = await Promise.all([
        Author.find().exec(),
        Genre.find().exec(),
      ]);

      // Mark our selected genres as checked.
      for (const genre of allGenres) {
        if (book.genre.indexOf(genre._id) > -1) {
          genre.checked = 'true';
        }
      }
      ejs.renderFile('views/book-form.ejs', {
        ttitle: "Create Book",
        authors: allAuthors,
        genres: allGenres,
        book: book,
        errors: errors.array(),
      }, { book }, function (err, str) {
        if (err) {
          console.log(err);
        } else {
          res.render("layout", { title: "Create Book", content: str });
        }
      });
    } else {
      // Data from form is valid. Save book.
      await book.save();
      res.redirect(book.url);
    }
  }),
];

// Display book delete form on GET.
exports.book_delete_get = asyncHandler(async (req, res, _next) => {
  const [book, bookInstances] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),
    BookInstance.find({ book: req.params.id }).exec(),
  ]);

  if (book === null) {
    // No results.
    res.redirect("/catalog/books");
  }
  ejs.renderFile('views/book-delete.ejs', {
    title: "Remove Book",
    book,
    book_instances: bookInstances,
    errors: null
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Remove Book", content: str });
    }
  });
})

// Handle book delete on POST.
exports.book_delete_post = asyncHandler(async (req, res, _next) => {
  // Assume the post has valid id (ie no validation/sanitization).

  const [book, bookInstances] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),
    BookInstance.find({ book: req.params.id }).exec(),
  ]);

  if (book === null) {
    // No results.
    res.redirect("/catalog/books");
  }

  if (bookInstances.length > 0) {
    // Book has book_instances. Render in same way as for GET route.
    ejs.renderFile('views/book-delete.ejs', {
      title: "Remove Book",
      book,
      book_instances: bookInstances,
      errors: null
    }, function (err, str) {
      if (err) {
        console.log(err);
      } else {
        res.render("layout", { title: "Remove Book", content: str });
      }
    });
  } else {
    // Book has no BookInstance objects. Delete object and redirect to the list of books.
    await Book.findByIdAndRemove(req.body.id);
    res.redirect("/catalog/books");
  }
});

// Display book update form on GET.
exports.book_update_get = asyncHandler(async (req, res, next) => {
  // Get book, authors and genres for form.
  const [book, allAuthors, allGenres] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),
    Author.find().exec(),
    Genre.find().exec(),
  ]);

  if (book === null) {
    // No results.
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  }

  // Mark our selected genres as checked.
  for (const genre of allGenres) {
    for (const book_g of book.genre) {
      if (genre._id.toString() === book_g._id.toString()) {
        genre.checked = "true";
      }
    }
  }
  ejs.renderFile('views/book-form.ejs', {
    title: "Update Book",
    authors: allAuthors,
    genres: allGenres,
    book,
    errors: null
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Create Book", content: str });
    }
  });
});

// Handle book update on POST.
exports.book_update_post = [
  // Convert the genre to an array.
  (req, _res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === "undefined") {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },

  // Validate and sanitize fields.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, _next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id.
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: typeof req.body.genre === "undefined" ? [] : req.body.genre,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form
      const [allAuthors, allGenres] = await Promise.all([
        Author.find().exec(),
        Genre.find().exec(),
      ]);

      // Mark our selected genres as checked.
      for (const genre of allGenres) {
        if (book.genre.includes(genre._id)) {
          genre.checked = "true";
        }
      }
      ejs.renderFile('views/book-form.ejs', {
        title: "Update Book",
        authors: allAuthors,
        genres: allGenres,
        book,
        errors: errors.array(),
      }, function (err, str) {
        if (err) {
          console.log(err);
        } else {
          res.render("layout", { title: "Create Book", content: str });
        }
      });
    } else {
      // Data from form is valid. Update the record.
      const thebook = await Book.findByIdAndUpdate(req.params.id, book, {});
      // Redirect to book detail page.
      res.redirect(thebook.url);
    }
  }),
];

