const ejs = require('ejs')
const Author = require("../models/author");
const Book = require("../models/book");

const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");

// Display list of all Authors.
exports.author_list = asyncHandler(async (_req, res, _next) => {
  const allAuthors = await Author.find().sort({ family_name: 1 }).exec();
  ejs.renderFile('views/author-list.ejs', { title: 'Book Instance List', author_list: allAuthors, }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Authors", content: str });
    }
  });
});

// Display detail page for a specific Author.
exports.author_detail = asyncHandler(async (req, res, next) => {
  // Get details of author and all their books (in parallel)
  const [author, allBooksByAuthor] = await Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({ author: req.params.id }, "title summary").exec(),
  ]);

  if (author === null) {
    // No results.
    const err = new Error("Author not found");
    err.status = 404;
    return next(err);
  }
  ejs.renderFile('views/author-detail.ejs', {
    title: "Author Detail",
    author: author,
    author_books: allBooksByAuthor
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Author Detail", content: str });
    }
  });
});

// Display Author create form on GET.
exports.author_create_get = (_req, res, _next) => {
  ejs.renderFile('views/author-form.ejs', {
    title: "Create Author",
    errors: null
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Create Author", content: str });
    }
  });
};

// Handle Author create on POST.
exports.author_create_post = [
  // Validate and sanitize fields.
  body("first_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("First name must be specified.")
    .isAlphanumeric()
    .withMessage("First name has non-alphanumeric characters."),
  body("family_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified.")
    .isAlphanumeric()
    .withMessage("Family name has non-alphanumeric characters."),
  body("date_of_birth", "Invalid date of birth")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, _next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create Author object with escaped and trimmed data
    const author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/errors messages.
      ejs.renderFile('views/author-form.ejs', {
        title: "Create Author",
        author: author,
        errors: errors.array(),
      }, function (err, str) {
        if (err) {
          console.log(err);
        } else {
          res.render("layout", { title: "Create Author", content: str });
        }
      });
    } else {
      // Data from form is valid, Save author.
      await author.save();

      // Redirect to author list.
      res.redirect('/catalog/authors');
    }
  }),
]

// Display Author delete form on GET.
exports.author_delete_get = asyncHandler(async (req, res, _next) => {
  // Get details of author and all their books (in parallel)
  const [author, allBooksByAuthor] = await Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({ author: req.params.id }, "title summary").exec(),
  ]);

  if (author === null) {
    // No results.
    res.redirect("/catalog/authors");
  }
  ejs.renderFile('views/author-delete.ejs', {
    title: "Delete Author",
    author: author,
    author_books: allBooksByAuthor,
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Delete Author", content: str });
    }
  });
});

// Handle Author delete on POST.
exports.author_delete_post = asyncHandler(async (req, res, _next) => {
  // Get details of author and all their books (in parallel)
  const [author, allBooksByAuthor] = await Promise.all([
    Author.findById(req.params.id).exec(),
    Book.find({ author: req.params.id }, "title summary").exec(),
  ]);

  if (allBooksByAuthor.length > 0) {
    // Author has books. Render in same way as for GET route.
    ejs.renderFile('views/author-delete.ejs', {
      title: "Delete Author",
      author: author,
      author_books: allBooksByAuthor,
    }, function (err, str) {
      if (err) {
        console.log(err);
      } else {
        res.render("layout", { title: "Delete Author", content: str });
      }
    });
  } else {
    // Author has no books. Delete object and redirect to the list of authors.
    await Author.findByIdAndRemove(req.body.authorid);
    res.redirect("/catalog/authors");
  }
});

// Display Author update form on GET.
exports.author_update_get = asyncHandler(async (req, res, next) => {
  const author = await Author.findById(req.params.id).exec();
  if (author === null) {
    // No results.
    const err = new Error("Author not found");
    err.status = 404;
    return next(err);
  }
  ejs.renderFile('views/author-form.ejs', {
    title: "Update Author",
    errors: null
  }, function (err, str) {
    if (err) {
      console.log(err);
    } else {
      res.render("layout", { title: "Update Author", content: str });
    }
  });
});

// Handle Author update on POST.
exports.author_update_post = [
  // Validate and sanitize fields.
  body("first_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("First name must be specified.")
    .isAlphanumeric()
    .withMessage("First name has non-alphanumeric characters."),
  body("family_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified.")
    .isAlphanumeric()
    .withMessage("Family name has non-alphanumeric characters."),
  body("date_of_birth", "Invalid date of birth")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  asyncHandler(async (req, res, _next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create Author object with escaped and trimmed data (and the old id!)
    const author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
      _id: req.params.id,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values and error messages.
      ejs.renderFile('views/author-form.ejs', {
        title: "Update Author",
        author: author,
        errors: errors.array(),
      }, function (err, str) {
        if (err) {
          console.log(err);
        } else {
          res.render("layout", { title: "Update Author", content: str });
        }
      });
    } else {
      // Data from form is valid. Update the record.
      await Author.findByIdAndUpdate(req.params.id, author);
      res.redirect(author.url);
    }
  }),
];
