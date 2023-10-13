const ejs = require('ejs')
const Book = require("../models/book");
const BookInstance = require("../models/bookinstance");
const asyncHandler = require("express-async-handler");
const { body, validationResult } = require("express-validator");


// Display list of all BookInstances.
exports.bookinstance_list = asyncHandler(async (req, res, next) => {
  const allBookInstances = await BookInstance.find().populate("book").exec();
  ejs.renderFile('views/bookinstance-list.ejs', { title: 'Book Instance List', bookinstance_list: allBookInstances }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Book Instances", content: str });
    }
  });
});

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = asyncHandler(async (req, res, next) => {
  const bookInstance = await BookInstance.findById(req.params.id)
    .populate("book")
    .exec();

  if (bookInstance === null) {
    // No results.
    const err = new Error("Book copy not found");
    err.status = 404;
    return next(err);
  }
  ejs.renderFile('views/bookinstance-detail.ejs', {
    bookinstance: bookInstance,
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Book Status", content: str });
    }
  });
});

// Display BookInstance create form on GET.
exports.bookinstance_create_get = asyncHandler(async (req, res, next) => {
  const allBooks = await Book.find({}, "title").exec();
  ejs.renderFile('views/bookinstance-form.ejs', {
    title: "Create BookInstance",
    book_list: allBooks,
    errors: null
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Create BookInstance", content: str });
    }
  });
});

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate and sanitize fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    const bookInstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      // There are errors.
      // Render form again with sanitized values and error messages.
      const allBooks = await Book.find({}, "title").exec();
      ejs.renderFile('views/bookinstance-form.ejs', {
        title: "Create BookInstance",
        book_list: allBooks,
        selected_book: bookInstance.book._id,
        errors: errors.array(),
        bookinstance: bookInstance,
      }, function (err, str) {
        if (err) {
          console.log(err);
        } else {
          res.render("layout", { title: "Create BookInstance", content: str });
        }
      });
    } else {
      // Data from form is valid
      await bookInstance.save();
      res.redirect(bookInstance.url);
    }
  }),
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = asyncHandler(async (req, res, next) => {
  const bookInstance = await BookInstance.findById(req.params.id)
    .populate("book")
    .exec();

  if (bookInstance === null) {
    // No results.
    res.redirect("/catalog/bookinstances");
  }
  ejs.renderFile('views/bookinstance-delete.ejs', {
    title: "Delete BookInstance",
    bookinstance: bookInstance,
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Create BookInstance", content: str });
    }
  });
});

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = asyncHandler(async (req, res, next) => {
  // Assume valid `BookInstance_id` in field.
  await BookInstance.findByIdAndRemove(req.body.id);
  res.redirect("/catalog/bookinstances");
});

// Display BookInstance update form on GET.
exports.bookinstance_update_get = asyncHandler(async (req, res, next) => {
  // Get book, all books for form (in parallel)
  const [bookInstance, allBooks] = await Promise.all([
    BookInstance.findById(req.params.id).populate("book").exec(),
    Book.find(),
  ]);

  if (bookInstance === null) {
    // No results.
    const err = new Error("Book copy not found");
    err.status = 404;
    return next(err);
  }
  ejs.renderFile('views/bookinstance-form.ejs', {
    title: "Update BookInstance",
    book_list: allBooks,
    selected_book: bookInstance.book._id,
    bookinstance: bookInstance,
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Update BookInstance", content: str });
    }
  });
});

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
  // Validate and sanitize fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped/trimmed data and current id.
    const bookInstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id,
    });

    if (!errors.isEmpty()) {
      // There are errors.
      // Render the form again, passing sanitized values and errors.

      const allBooks = await Book.find({}, "title").exec();
      ejs.renderFile('views/bookinstance-form.ejs', {
        title: "Update BookInstance",
        book_list: allBooks,
        selected_book: bookInstance.book._id,
        errors: errors.array(),
        bookinstance: bookInstance,
      }, function (err, str) {
        if (err) {
          console.log(err);
        } else {
          res.render("layout", { title: "Update BookInstance", content: str });
        }
      });
    } else {
      // Data from form is valid.
      await BookInstance.findByIdAndUpdate(req.params.id, bookInstance, {});
      // Redirect to detail page.
      res.redirect(bookInstance.url);
    }
  }),
];
