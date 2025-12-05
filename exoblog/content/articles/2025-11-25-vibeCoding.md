---
date: '2025-11-25T23:03:09Z'
draft: false
title: 'Vibe Coding'
author: pre
category:
- news
- exocortexLog
cover:
  alt: Screenshot of Shakespeare
  image: img/2025/shakespeare.png
---

After watching <a href="https://primal.net/derekross">@derekross@grownostr.org</a>
do a talk and demo of <a href="https://shakespeare.diy/">Shakespeare</a> 
I figured I probably ought to try this vibe coding everyone's
going on about more deeply than pasting function from ChatGTP.

But what to test with? I have been using a 
a half written life-logging app in various forms
for more than a decade. It run in my smart watch for
a while but mostly it's been an android app made
with web tools.

Might as well see if we can get that done more than
ever before I suppose.

Shakespeare is a Chrome app with a split panel view, 
one side previewing the thing you're building and
the other is a chat with the robot that builds it.

It does build something pretty nice pretty fast.

Within a day I am quite impressed. The grid display
for events works, the data seems to be properly 
stored in the IndexDB, the add-event dialog is
exactly as I described it.

It detects when there are console errors and offers
to look into them.

Trouble here is some other plugins seem to still be
active and they, confused at being in the app sandbox,
emit errors which the chat model can't diagnose because
they are not emitted by the code it's examining.

When it gets stuck is can really rip the code apart
trying to fix things. Rewriting entire functions,
even at one point getting itself into an incredible
mess by trying to change the build process itself.

But mostly it's just doing as I ask, making the changes
I request, and doing it fairly efficiently.

Haven't yet looked at the actual code it's producing
though. So hard to tell how actually good it is other
than doing as well or better than I would at the UI.

Man it gets grating being told "You're absolutely right" 
over an over again before it even checks the code to
see if I really am actually right. 😆

Running out of credit or chatbox context-window space
in the middle of a task can leave the codebase in
a tricky half-changed situation. 

The machine is committing to Git fairly well though,
so when it freaks out and murders the code the
rollback function seems like it usually rescues
things.


Main criticisms of Shakespeare at this point is that
I find I want better chat-management features.

The ability to switch back to old chat contexts to continue
with a feature after swapping to a new one. Or to 
edit the chat itself: Sometimes it goes down blind
alleys or spends a lot of tokens talking about what it
has done. Would be good to be able to just cut out
or edit huge chunks of the prior chat window before
continuing. To manage it's space.

Building code this way still requires being methodical,
cyclical, gradual and checking and testing everything
at every stage. If you can do these things and also
describe what you want in detail then you probably really
are already a dev, so not sure how well non-dev users
will be doing. I certainly find myself describing how to
change particular HTML tags or write specific functions,
using the language we have to talk about code which
non-dev users won't have. So hard to tell how well this
could work for non coders.

For me though, it's going very well in the early prototype
stage at least.


