We audited every error string in the product last month. There were 412 of
them. Eleven contained a stack trace, forty were the word "Error", and one
told a customer their request had been "rejected by the validator", which is
true and completely useless.

Here is the guide we wrote afterwards, and now hold each other to in review.

## Name what happened, not what failed

An error message describes the world, not our code. "The upload could not
finish" is about the customer's file. "UploadHandler threw" is about us.

| Instead of             | Write                                           |
| ---------------------- | ----------------------------------------------- |
| `Invalid input`        | That email address is missing an @              |
| `Request failed (500)` | We could not save your changes. Try again.      |
| `Unauthorized`         | Your session expired. Sign back in to continue. |

## Say what to do next

Every message ends with an action the reader can take, or an honest statement
that there is nothing to take. "Try again in a minute" is an action. "Contact
support" is an action only if the message carries the reference the support
team will ask for.

If the answer really is "wait", say how long.

## Keep the tone level

No exclamation marks, no apologies stacked on apologies, no blame. The reader
is already having a worse minute than we are.

- **Not**: Oops! Something went wrong 😬
- **Not**: You entered an invalid date.
- **Yes**: That date is in the past. Pick a day from today onwards.

The second one is interesting. It is grammatical, calm, and still wrong,
because it makes the reader the subject of the failure. Most of our worst
messages failed on that line rather than on tone.

## One message, one problem

When three fields are wrong, three messages appear, each next to its field.
A single banner listing three problems forces the reader to hold a list in
their head while they work down the form.

## Write it before the code

The last rule is the one that changed the most: the message goes in the pull
request description before the branch is opened. If it cannot be written
plainly, the behaviour underneath it is usually the thing that needs
changing.
