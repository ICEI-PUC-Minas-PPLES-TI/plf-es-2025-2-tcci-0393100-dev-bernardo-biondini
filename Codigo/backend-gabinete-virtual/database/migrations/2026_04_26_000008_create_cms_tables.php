<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_sections', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('title');
            $table->longText('content');
            $table->timestamps();
        });

        Schema::create('news', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->longText('content');
            $table->string('image_path')->nullable();
            $table->dateTime('published_at');
            $table->foreignId('author_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('site_projects', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->longText('description');
            $table->enum('status', ['planned', 'in_progress', 'completed']);
            $table->foreignId('city_id')->constrained('cities')->restrictOnDelete();
            $table->string('cover_image_path')->nullable();
            $table->foreignId('author_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_projects');
        Schema::dropIfExists('news');
        Schema::dropIfExists('cms_sections');
    }
};
