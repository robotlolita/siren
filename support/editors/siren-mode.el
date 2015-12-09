;;; siren-mode.el --- Major mode for the Siren language

;; Copyright (C) 2015 Quildreen Motta

;; Version: 0.1.0
;; Keywords: Siren major mode
;; Author: Quildreen Motta <quildreen@gmail.com>
;; Url: http://github.com/siren-language/siren-mode

;; This file is not part of GNU Emacs.

;; This program is free software; you can redistribute it and/or modify
;; it under the terms of the GNU General Public License as published by
;; the Free Software Foundation; either version 2, or (at your option)
;; any later version.

;; This program is distributed in the hope that it will be useful,
;; but WITHOUT ANY WARRANTY; without even the implied warranty of
;; MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
;; GNU General Public License for more details.

;; You should have received a copy of the GNU General Public License
;; along with this program; if not, write to the Free Software
;; Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.

;;; Commentary

;; Fairly basic (for now) mode for Siren

;;; Code:
(setq siren-mode-keywords
      '("extend" "let" "def" "do" "return" "module" "exposing" "with" "where" "use" "in" "using"))

(setq siren-mode-constants
      '("this"))

(setq siren-mode-keyword-regexp
  (regexp-opt siren-mode-keywords 'words))

(setq siren-mode-constant-regexp
  (regexp-opt siren-mode-constants 'words))

(setq siren-mode-special-symbol-regexp
  "\\.\\|{\\|}\\|;\\||\\(\\_<\\(>>\\|<-\\|,\\|_\\|@\\)\\_>\\)")

(setq siren-mode-string-regexp
  "\"\\{3\\}\\(\\|\"\\{1,2\\}\\|[^\"]\\)*\"\\{3,\\}")

(setq siren-mode-keyword-app-regexp "\\b[^[:space:](){};._,$@^\n]*:")

(setq siren-mode-maybe-constructor-regexp "\\<[[:upper:]][^[:space:](){};._,$@^\n]*")

(setq siren-mode-variable-regexp "\\<$[^[:space:](){};._,$@^\n]*")

(setq siren-mode-font-lock-keywords
  `((,siren-mode-string-regexp . font-lock-string-face)
    (,siren-mode-keyword-app-regexp . font-lock-builtin-face)
    (,siren-mode-maybe-constructor-regexp . font-lock-type-face)
    (,siren-mode-variable-regexp . font-lock-variable-name-face)
    (,siren-mode-constant-regexp . font-lock-constant-face)
    (,siren-mode-keyword-regexp . font-lock-keyword-face)
    (,siren-mode-special-symbol-regexp . font-lock-comment-face)
    ))


(define-derived-mode siren-mode fundamental-mode
  "Siren"
  "Major mode for Siren"

  (setq font-lock-defaults '((siren-mode-font-lock-keywords)))


  (setq comment-start "#")
  (setq comment-end "")
  (modify-syntax-entry ?# "< b" siren-mode-syntax-table)
  (modify-syntax-entry ?\n "> b" siren-mode-syntax-table)
)

;;
;; On Load
;;

;;;###autoload
(add-to-list 'auto-mode-alist '("\\.siren\\'" . siren-mode))

(provide 'siren-mode)
;;; siren-mode.el ends here
